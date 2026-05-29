import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

async function installRuntimeExternals() {
  // esbuild marks some packages as `external`, meaning the runtime must
  // provide them at import time. Cleanup deletes workspace node_modules,
  // so we install the externalized-AND-installed runtime deps into
  // `dist/node_modules` as a self-contained flat tree using npm.
  //
  // To find which deps need installing, intersect package.json `dependencies`
  // with esbuild's external list (string match or glob match).
  const pkgJsonPath = path.resolve(artifactDir, "package.json");
  const pkg = JSON.parse(
    await import("node:fs").then((m) => m.promises.readFile(pkgJsonPath, "utf8")),
  );
  const allDeps = pkg.dependencies || {};

  // Hardcoded list of externalized-AND-installed deps that the runtime needs.
  // Keep in sync with build.mjs externals + package.json dependencies.
  // These are the only externalized packages actually present in dependencies.
  const RUNTIME_EXTERNALS = ["@google-cloud/text-to-speech", "bcrypt"];

  const toInstall = {};
  for (const name of RUNTIME_EXTERNALS) {
    if (allDeps[name]) toInstall[name] = allDeps[name];
    else console.warn(`  [warn] runtime external ${name} not in dependencies`);
  }
  if (Object.keys(toInstall).length === 0) return;

  const distDir = path.resolve(artifactDir, "dist");
  const distPkgPath = path.join(distDir, "package.json");
  await writeFile(
    distPkgPath,
    JSON.stringify(
      {
        name: "@workspace/api-server-runtime",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: toInstall,
      },
      null,
      2,
    ),
  );

  console.log(`Installing runtime externals into dist/node_modules: ${Object.keys(toInstall).join(", ")}`);
  execSync(
    "npm install --omit=dev --no-package-lock --no-audit --no-fund --loglevel=error",
    { cwd: distDir, stdio: "inherit" },
  );
  console.log("Runtime externals installed.");
}

buildAll()
  .then(installRuntimeExternals)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
