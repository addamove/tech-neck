import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const configuredBase =
    process.env.VITE_BASE_PATH ??
    loadEnv(mode, process.cwd(), "VITE_").VITE_BASE_PATH ??
    "/";
  const base = configuredBase.endsWith("/")
    ? configuredBase
    : `${configuredBase}/`;
  if (!base.startsWith("/") || base.startsWith("//")) {
    throw new Error(
      "VITE_BASE_PATH must be a local path such as / or /tech-neck/.",
    );
  }
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        base,
        scope: base,
        includeAssets: [
          "icon.svg",
          "icon-192.png",
          "icon-512.png",
          "art/*.png",
        ],
        manifest: {
          name: "Tech Neck — Daily Reset",
          short_name: "Tech Neck",
          description: "A guided daily neck and posture routine.",
          theme_color: "#2dbdb3",
          background_color: "#ffffff",
          display: "standalone",
          id: base,
          start_url: base,
          scope: base,
          icons: [
            {
              src: `${base}icon-192.png`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: `${base}icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: `${base}index.html`,
          globPatterns: ["**/*.{js,css,html,svg,png,webp,json,m4a,mp3,wav}"],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        },
      }),
    ],
  };
});
