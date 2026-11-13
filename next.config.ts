import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Render <title>/<meta> in the <head> for every client (Next 15.2+ streams them into <body> for non-bots, which
  // link previews and Lighthouse's SEO audit don't read).
  htmlLimitedBots: /.*/,
  // Avatar uploads (10 MB max, checked again on the server) go through a server action.
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
    // Import only the Radix primitives each page uses from the unified "radix-ui" package (barrel file).
    optimizePackageImports: ["radix-ui"],
  },
  // Loaded from node_modules at runtime: heic-convert ships a WebAssembly HEIF decoder that bundling breaks.
  serverExternalPackages: ["heic-convert"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The service worker must always be re-checked so fixes reach installed apps quickly.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // Admin pages, sign-in and the styleguide must never be indexed (middleware also sets this).
        source: "/(admin|styleguide|login|auth)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
