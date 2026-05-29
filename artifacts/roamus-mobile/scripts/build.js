const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

let metroProcess = null;

const projectRoot = path.resolve(__dirname, "..");

function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error("Could not find workspace root (no pnpm-workspace.yaml found)");
}

const workspaceRoot = findWorkspaceRoot(projectRoot);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

function exitWithError(message) {
  console.error(message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function stripProtocol(domain) {
  let urlString = domain.trim();

  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }

  console.error(
    "ERROR: No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN",
  );
  process.exit(1);
}

function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  const staticBuild = path.join(projectRoot, "static-build");
  if (fs.existsSync(staticBuild)) {
    fs.rmSync(staticBuild, { recursive: true });
  }

  const dirs = [
    path.join(staticBuild, timestamp, "_expo", "static", "js", "ios"),
    path.join(staticBuild, timestamp, "_expo", "static", "js", "android"),
    path.join(staticBuild, "ios"),
    path.join(staticBuild, "android"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Build:", timestamp);
}

function clearMetroCache() {
  console.log("Clearing Metro cache...");

  const cacheDirs = [
    path.join(projectRoot, ".metro-cache"),
    path.join(projectRoot, "node_modules/.cache/metro"),
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log("Cache cleared");
}

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getExpoPublicReplId() {
  return process.env.REPL_ID || process.env.EXPO_PUBLIC_REPL_ID;
}

async function startMetro(expoPublicDomain, expoPublicReplId) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
    EXPO_PUBLIC_REPL_ID: expoPublicReplId,
  };

  if (expoPublicReplId) {
    console.log(`Setting EXPO_PUBLIC_REPL_ID=${expoPublicReplId}`);
  }

  metroProcess = spawn(
    "pnpm",
    [
      "exec",
      "expo",
      "start",
      "--no-dev",
      "--minify",
      "--localhost",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      cwd: projectRoot,
      env,
    },
  );

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro ready");
      return;
    }
  }

  console.error("Metro timeout");
  process.exit(1);
}

async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const fiveMinMS = 5 * 60 * 1_000;
  const timeoutId = setTimeout(() => controller.abort(), fiveMinMS);

  try {
    console.log(`Downloading: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    const fileSize = fs.statSync(outputPath).size;

    if (fileSize === 0) {
      fs.unlinkSync(outputPath);
      throw new Error("Downloaded file is empty");
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    if (error.name === "AbortError") {
      throw new Error(`Download timeout after 5m: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundle(platform, timestamp) {
  const entryPath = path.resolve(projectRoot, "node_modules", "expo-router", "entry");
  const bundlePath = path.relative(workspaceRoot, entryPath);
  const url = new URL(`http://localhost:8081/${bundlePath}.bundle`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("dev", "false");
  url.searchParams.set("hot", "false");
  url.searchParams.set("lazy", "false");
  url.searchParams.set("minify", "true");

  const output = path.join(
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
    platform,
    "bundle.js",
  );

  console.log(`Fetching ${platform} bundle...`);
  await downloadFile(url.toString(), output);
  console.log(`${platform} bundle ready`);
}

async function downloadManifest(platform) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    console.log(`Fetching ${platform} manifest...`);
    const response = await fetch("http://localhost:8081/manifest", {
      headers: { "expo-platform": platform },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    console.log(`${platform} manifest ready`);
    return manifest;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `Manifest download timeout after 5m for platform: ${platform}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundlesAndManifests(timestamp) {
  console.log("Downloading bundles and manifests...");
  console.log("This may take several minutes for production builds...");

  try {
    // Bundles are sequential — Metro can't handle both platforms simultaneously
    // without stalling. Manifests are cheap and run in parallel after.
    await downloadBundle("ios", timestamp);
    await downloadBundle("android", timestamp);

    const [iosManifest, androidManifest] = await Promise.all([
      downloadManifest("ios"),
      downloadManifest("android"),
    ]);

    console.log("All downloads completed successfully");
    return { ios: iosManifest, android: androidManifest };
  } catch (error) {
    exitWithError(`Download failed: ${error.message}`);
  }
}

function extractAssets(timestamp) {
  const staticBuild = path.join(projectRoot, "static-build");
  const bundles = {
    ios: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "ios", "bundle.js"),
      "utf-8",
    ),
    android: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "android", "bundle.js"),
      "utf-8",
    ),
  };

  const assetsMap = new Map();
  const assetPattern =
    /httpServerLocation:"([^"]+)"[^}]*hash:"([^"]+)"[^}]*name:"([^"]+)"[^}]*type:"([^"]+)"/g;

  const extractFromBundle = (bundle, platform) => {
    for (const match of bundle.matchAll(assetPattern)) {
      const originalPath = match[1];
      const filename = match[3] + "." + match[4];

      const tempUrl = new URL(`http://localhost:8081${originalPath}`);
      const unstablePath = tempUrl.searchParams.get("unstable_path");

      if (!unstablePath) {
        throw new Error(`Asset missing unstable_path: ${originalPath}`);
      }

      const decodedPath = decodeURIComponent(unstablePath);
      const key = path.posix.join(decodedPath, filename);

      if (!assetsMap.has(key)) {
        const asset = {
          url: path.posix.join("/", decodedPath, filename),
          originalPath: originalPath,
          filename: filename,
          relativePath: decodedPath,
          hash: match[2],
          platforms: new Set(),
        };

        assetsMap.set(key, asset);
      }
      assetsMap.get(key).platforms.add(platform);
    }
  };

  extractFromBundle(bundles.ios, "ios");
  extractFromBundle(bundles.android, "android");

  return Array.from(assetsMap.values());
}

async function downloadAssets(assets, timestamp) {
  if (assets.length === 0) {
    return 0;
  }

  console.log("Copying assets...");
  let successCount = 0;
  const failures = [];

  const downloadPromises = assets.map(async (asset) => {
    const tempUrl = new URL(`http://localhost:8081${asset.originalPath}`);
    const unstablePath = tempUrl.searchParams.get("unstable_path");

    if (!unstablePath) {
      throw new Error(`Asset missing unstable_path: ${asset.originalPath}`);
    }

    const decodedPath = decodeURIComponent(unstablePath);

    const outputDir = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      asset.relativePath,
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const output = path.join(outputDir, asset.filename);

    try {
      const candidates = [
        path.join(projectRoot, decodedPath, asset.filename),
        path.join(workspaceRoot, decodedPath, asset.filename),
      ];
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) {
        throw new Error(`Asset not found on disk: ${asset.filename}`);
      }
      fs.copyFileSync(found, output);
      successCount++;
    } catch (error) {
      failures.push({
        filename: asset.filename,
        error: error.message,
        url: asset.originalPath,
      });
    }
  });

  await Promise.all(downloadPromises);

  if (failures.length > 0) {
    const errorMsg =
      `Failed to download ${failures.length} asset(s):\n` +
      failures
        .map((f) => `  - ${f.filename}: ${f.error} (${f.url})`)
        .join("\n");
    exitWithError(errorMsg);
  }

  console.log(`Copied ${successCount} assets`);
  return successCount;
}

function updateBundleUrls(timestamp, baseUrl) {
  const updateForPlatform = (platform) => {
    const bundlePath = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      platform,
      "bundle.js",
    );
    let bundle = fs.readFileSync(bundlePath, "utf-8");

    bundle = bundle.replace(
      /httpServerLocation:"(\/[^"]+)"/g,
      (_match, capturedPath) => {
        const tempUrl = new URL(`http://localhost:8081${capturedPath}`);
        const unstablePath = tempUrl.searchParams.get("unstable_path");

        if (!unstablePath) {
          throw new Error(
            `Asset missing unstable_path in bundle: ${capturedPath}`,
          );
        }

        const decodedPath = decodeURIComponent(unstablePath);
        return `httpServerLocation:"${baseUrl}${basePath}/${timestamp}/_expo/static/js/${decodedPath}"`;
      },
    );

    fs.writeFileSync(bundlePath, bundle);
  };

  updateForPlatform("ios");
  updateForPlatform("android");
  console.log("Updated bundle URLs");
}

function updateManifests(manifests, timestamp, baseUrl, assetsByHash) {
  const updateForPlatform = (platform, manifest) => {
    if (!manifest.launchAsset || !manifest.extra) {
      exitWithError(`Malformed manifest for ${platform}`);
    }

    manifest.launchAsset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${platform}/bundle.js`;
    manifest.launchAsset.key = `bundle-${timestamp}`;
    manifest.createdAt = new Date(
      Number(timestamp.split("-")[0]),
    ).toISOString();
    manifest.extra.expoClient.hostUri =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.debuggerHost =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.packagerOpts.dev = false;

    if (manifest.assets && manifest.assets.length > 0) {
      manifest.assets.forEach((asset) => {
        if (!asset.url) return;

        const hash = asset.hash;
        if (!hash) return;

        const assetInfo = assetsByHash.get(hash);
        if (!assetInfo) return;

        asset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${assetInfo.relativePath}/${assetInfo.filename}`;
      });
    }

    fs.writeFileSync(
      path.join(projectRoot, "static-build", platform, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  };

  updateForPlatform("ios", manifests.ios);
  updateForPlatform("android", manifests.android);
  console.log("Manifests updated");
}

async function main() {
  console.log("Building static Expo Go deployment...");

  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const expoPublicReplId = getExpoPublicReplId();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  await startMetro(domain, expoPublicReplId);

  const downloadTimeout = 600000;
  const downloadPromise = downloadBundlesAndManifests(timestamp);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Overall download timeout after ${downloadTimeout / 1000} seconds. ` +
            "Metro may be struggling to generate bundles. Check Metro logs above.",
        ),
      );
    }, downloadTimeout);
  });

  const manifests = await Promise.race([downloadPromise, timeoutPromise]);

  console.log("Processing assets...");
  const assets = extractAssets(timestamp);
  console.log("Found", assets.length, "unique asset(s)");

  const assetsByHash = new Map();
  for (const asset of assets) {
    assetsByHash.set(asset.hash, {
      relativePath: asset.relativePath,
      filename: asset.filename,
    });
  }

  const assetCount = await downloadAssets(assets, timestamp);

  if (assetCount > 0) {
    updateBundleUrls(timestamp, baseUrl);
  }

  console.log("Updating manifests and creating landing page...");
  updateManifests(manifests, timestamp, baseUrl, assetsByHash);

  console.log("Build complete! Deploy to:", baseUrl);

  if (metroProcess) {
    metroProcess.kill();
  }

  // -------------------------------------------------------------------
  // Bundle the node runtime into the workspace (Repl layer) so it is
  // available in the production runtime container.
  //
  // WHY: the runtime container's Nix store only contains the closure of
  // `replit-runtime-path` (the hosting base). It does NOT include
  // `nodejs_pid2`, so `available-pid2-node-paths` returns nothing there.
  //
  // APPROACH:
  //  1. In the BUILD container, `available-pid2-node-paths` works and
  //     returns the actual node binary path.
  //  2. Copy that binary into `node-bundle/bin/node` (Repl layer).
  //  3. Patch its ELF interpreter: swap the build-container glibc hash
  //     for the runtime-container glibc hash. Both are glibc-2.40-66,
  //     same ABI, just different Nix derivation inputs.
  //     - Build glibc:   daamdpmaz2vjvna55ccrc30qw3qb8h6d
  //     - Runtime glibc: g8zyryr9cr6540xsyg4avqkwgxpnwj2a
  //     (runtime hash verified by inspecting ldd of replit-runtime-path
  //     tools, which are guaranteed present in the runtime container.)
  //  4. Copy non-glibc .so deps (openssl, libuv, sqlite, icu4c, zlib,
  //     gcc-libs) into `node-bundle/lib/`.
  //  5. At runtime, start.sh sets LD_LIBRARY_PATH so the patched node
  //     binary finds its libraries without the Nix store.
  // -------------------------------------------------------------------

  /**
   * Patch the PT_INTERP segment of a 64-bit ELF binary in-place.
   * The new interpreter string must be ≤ the old one in byte length.
   */
  function patchElfInterpreter(binaryPath, newInterp) {
    const data = Buffer.from(fs.readFileSync(binaryPath));
    if (data.readUInt32BE(0) !== 0x7f454c46) throw new Error("Not an ELF file");

    const e_phoff = Number(data.readBigUInt64LE(0x20));
    const e_phentsize = data.readUInt16LE(0x36);
    const e_phnum = data.readUInt16LE(0x38);

    for (let i = 0; i < e_phnum; i++) {
      const ph = e_phoff + i * e_phentsize;
      if (data.readUInt32LE(ph) !== 3 /* PT_INTERP */) continue;

      const p_offset = Number(data.readBigUInt64LE(ph + 8));
      const p_filesz = Number(data.readBigUInt64LE(ph + 32));

      const current = data.subarray(p_offset, p_offset + p_filesz - 1).toString();
      console.log(`  ELF interpreter: ${current}`);

      const newBytes = Buffer.from(newInterp + "\0");
      if (newBytes.length > p_filesz)
        throw new Error(`New interpreter path too long (${newBytes.length} > ${p_filesz})`);

      const patched = Buffer.from(data);
      newBytes.copy(patched, p_offset);
      patched.fill(0, p_offset + newBytes.length, p_offset + p_filesz);
      fs.writeFileSync(binaryPath, patched);
      fs.chmodSync(binaryPath, 0o755);
      console.log(`  → patched to:    ${newInterp}`);
      return;
    }
    throw new Error("No PT_INTERP segment found in ELF");
  }

  // Fully self-contained node bundle. We do NOT depend on the runtime container
  // providing any specific glibc path — we bundle ld-linux and ALL .so deps
  // (including glibc) inside node-bundle/lib/ and patch the node binary's ELF
  // interpreter to point at our bundled ld-linux. LD_LIBRARY_PATH then makes
  // the bundled linker find everything inside node-bundle/lib/.

  const BUNDLE_NODE = "/home/runner/workspace/node-bundle/bin/node";
  const BUNDLE_LIB = "/home/runner/workspace/node-bundle/lib";
  const BUNDLE_LD = `${BUNDLE_LIB}/ld-linux-x86-64.so.2`; // 59 chars — fits in PT_INTERP slot

  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const nodeSrc = process.execPath;
    console.log(`\nBundling node runtime: ${nodeSrc}`);

    const bundleDir = path.join(workspaceRoot, "node-bundle");
    fs.mkdirSync(path.join(bundleDir, "bin"), { recursive: true });
    fs.mkdirSync(path.join(bundleDir, "lib"), { recursive: true });

    // 1. Copy node binary
    const nodeDest = path.join(bundleDir, "bin", "node");
    fs.copyFileSync(nodeSrc, nodeDest);
    fs.chmodSync(nodeDest, 0o755);

    // 2. Read current ELF interpreter to find the build glibc store path,
    //    then copy ld-linux from there into node-bundle/lib/.
    const nodeBuf = Buffer.from(fs.readFileSync(nodeSrc));
    let buildInterp = null;
    {
      const e_phoff = Number(nodeBuf.readBigUInt64LE(0x20));
      const e_phentsize = nodeBuf.readUInt16LE(0x36);
      const e_phnum = nodeBuf.readUInt16LE(0x38);
      for (let i = 0; i < e_phnum; i++) {
        const ph = e_phoff + i * e_phentsize;
        if (nodeBuf.readUInt32LE(ph) !== 3) continue;
        const p_offset = Number(nodeBuf.readBigUInt64LE(ph + 8));
        const p_filesz = Number(nodeBuf.readBigUInt64LE(ph + 32));
        buildInterp = nodeBuf.subarray(p_offset, p_offset + p_filesz - 1).toString();
        break;
      }
    }
    if (!buildInterp) throw new Error("Could not read PT_INTERP from node binary");
    console.log(`  Build ELF interpreter: ${buildInterp}`);

    const ldDest = path.join(bundleDir, "lib", "ld-linux-x86-64.so.2");
    fs.copyFileSync(buildInterp, ldDest);
    fs.chmodSync(ldDest, 0o755);
    console.log(`  Copied ld-linux → ${ldDest}`);

    // 3. Patch ELF interpreter to point at our bundled ld-linux
    patchElfInterpreter(nodeDest, BUNDLE_LD);

    // 4. Copy ALL dynamic library dependencies (including glibc libs)
    //    so the bundled ld-linux can resolve everything via LD_LIBRARY_PATH.
    const lddOut = execSync(`ldd "${nodeSrc}"`, { encoding: "utf8" });
    let copiedLibs = 0;
    for (const line of lddOut.split("\n")) {
      const m = line.match(/=>\s+(\/nix\/store\/[^\s]+\.so[^\s]*)/);
      if (!m) continue;
      const libSrc = m[1];
      const libDest = path.join(bundleDir, "lib", path.basename(libSrc));
      try {
        fs.copyFileSync(libSrc, libDest);
        copiedLibs++;
      } catch (e) {
        console.log(`  Warning: could not copy ${libSrc}: ${e.message}`);
      }
    }
    console.log(`  Copied ${copiedLibs} libraries to node-bundle/lib/`);

    // 5. Smoke-test the bundle locally to fail the build early if it's broken.
    try {
      const out = execSync(
        `LD_LIBRARY_PATH=${BUNDLE_LIB} ${nodeDest} -e 'console.log("ok",process.version)'`,
        { encoding: "utf8" },
      );
      console.log(`  Bundle smoke test: ${out.trim()}`);
    } catch (e) {
      console.log(`  Bundle smoke test FAILED: ${e.message}`);
      console.log(`  stdout: ${e.stdout?.toString?.() || ""}`);
      console.log(`  stderr: ${e.stderr?.toString?.() || ""}`);
      throw new Error("Bundled node binary failed to execute — aborting build");
    }

    console.log("Node bundle ready.\n");
  }

  // Write startup shell scripts for both services using the self-contained
  // bundled node — no dependency on runtime container Nix paths.
  console.log("Writing start scripts (bundled-node strategy)...");

  const apiStartScript = `#!/bin/sh
export LD_LIBRARY_PATH=${BUNDLE_LIB}
exec ${BUNDLE_NODE} --enable-source-maps artifacts/api-server/dist/index.mjs
`;
  fs.writeFileSync(
    path.join(workspaceRoot, "artifacts/api-server/start.sh"),
    apiStartScript,
  );
  fs.chmodSync(path.join(workspaceRoot, "artifacts/api-server/start.sh"), 0o755);

  const mobileStartScript = `#!/bin/sh
export LD_LIBRARY_PATH=${BUNDLE_LIB}
cd ${workspaceRoot} && exec ${BUNDLE_NODE} artifacts/roamus-mobile/server/serve.js
`;
  fs.writeFileSync(
    path.join(workspaceRoot, "artifacts/roamus-mobile/start.sh"),
    mobileStartScript,
  );
  fs.chmodSync(path.join(workspaceRoot, "artifacts/roamus-mobile/start.sh"), 0o755);

  console.log("Start scripts written.");

  // Deployment-only cleanup: runs after all artifact builds complete (mobile is last).
  // Removes large directories not needed at runtime to keep the image under 8 GiB.
  // Gated on REPLIT_INTERNAL_APP_DOMAIN which is only set inside deployment containers.
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    console.log("Post-build cleanup: shrinking image for deployment...");

    function rmrf(p) {
      if (fs.existsSync(p)) {
        try {
          fs.rmSync(p, { recursive: true, force: true });
          console.log(`  Removed ${p}`);
        } catch (e) {
          console.log(`  Could not remove ${p}: ${e.message}`);
        }
      }
    }

    // 1. Migration backup leftover (~4 GB of old project files)
    rmrf(path.join(workspaceRoot, ".migration-backup"));

    // 2. Git history (~4+ GB)
    rmrf(path.join(workspaceRoot, ".git"));

    // 3. Every node_modules directory in the workspace (all builds are self-contained).
    //    Skip dist and static-build — they contain serving assets.
    const SKIP = new Set(["dist", "static-build", ".git", ".migration-backup"]);
    function pruneNodeModules(dir, depth) {
      if (depth > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name === "node_modules") {
          rmrf(full);
        } else if (!SKIP.has(entry.name)) {
          pruneNodeModules(full, depth + 1);
        }
      }
    }
    console.log("  Removing workspace node_modules...");
    pruneNodeModules(workspaceRoot, 0);

    // 4. pnpm content-addressable store — actual package data lives here, not in
    //    node_modules (which only holds hardlinks). This is the largest cache.
    try {
      const storePath = execSync("pnpm store path 2>/dev/null", { encoding: "utf8" }).trim();
      if (storePath) rmrf(storePath);
    } catch (_) {}

    // 5. Workspace-level build caches (pnpm metadata, TypeScript incremental)
    //    NOTE: do NOT remove .local/state — Replit's Nix user profile lives there
    //    and the production container needs it to resolve node/pnpm in $PATH.
    rmrf(path.join(workspaceRoot, ".cache"));

    // 6. Source assets already baked into dist — roamus/public/ is copied verbatim
    //    into dist/public/ by Vite; the source copy is redundant after the build.
    rmrf(path.join(workspaceRoot, "artifacts", "roamus", "public"));

    // 7. Home-directory caches (npm, pnpm, metro, yarn)
    const home = os.homedir();
    for (const rel of [
      ".npm",
      ".cache/node",
      ".cache/metro",
      ".local/share/pnpm",
      ".pnpm-store",
      ".yarn/cache",
    ]) {
      rmrf(path.join(home, rel));
    }

    console.log("Cleanup complete.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
});
