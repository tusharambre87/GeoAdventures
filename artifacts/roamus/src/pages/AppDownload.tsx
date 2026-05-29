import { useEffect, useState } from "react";

const APP_STORE_URL = "https://apps.apple.com/app/roamus/id0000000000";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.roamus.app";
const PAGE_URL = "https://app.roamus.app/app-download";

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export default function AppDownload() {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);
    if (detected === "ios") {
      window.location.replace(APP_STORE_URL);
    } else if (detected === "android") {
      window.location.replace(PLAY_STORE_URL);
    }
  }, []);

  if (platform === null || platform === "ios" || platform === "android") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🌍</div>
          <p className="text-blue-700 font-medium text-lg">Opening the store…</p>
        </div>
      </div>
    );
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PAGE_URL)}&color=1e40af&bgcolor=ffffff`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="text-7xl">🌍</div>
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">RoamUs</h1>
          <p className="text-blue-700 text-lg leading-snug">
            Family travel adventures, right in your pocket.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <p className="text-slate-600 text-sm font-medium uppercase tracking-widest">
            Scan to download
          </p>
          <div className="flex justify-center">
            <img
              src={qrSrc}
              alt="QR code to download RoamUs"
              width={180}
              height={180}
              className="rounded-xl border border-blue-100"
            />
          </div>
          <p className="text-slate-500 text-sm">
            Point your phone camera at the code above, or tap a badge below.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-app-store"
              className="inline-flex items-center gap-3 bg-black text-white rounded-xl px-5 py-3 hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-75 leading-none">Download on the</div>
                <div className="text-base font-semibold leading-tight">App Store</div>
              </div>
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-play-store"
              className="inline-flex items-center gap-3 bg-black text-white rounded-xl px-5 py-3 hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0" aria-hidden="true">
                <path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z" />
                <path d="M3.5 3.5 14.06 12 3.5 20.5" className="fill-none stroke-white stroke-[.5]" />
                <path d="m3.5 20.5 7.56-7.56L14 16l-4 4.5" className="fill-[#00d2ff]" />
                <path d="m3.5 3.5 7.56 7.56L14 8 10 3.5" className="fill-[#ff3d00]" />
                <path d="M14 8l3.5 2-3.5 2" className="fill-[#ffd600]" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-75 leading-none">Get it on</div>
                <div className="text-base font-semibold leading-tight">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        <p className="text-blue-500 text-xs">
          © {new Date().getFullYear()} RoamUs · Family adventures, everywhere
        </p>
      </div>
    </div>
  );
}
