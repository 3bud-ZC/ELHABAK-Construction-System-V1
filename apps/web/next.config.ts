import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@elhabak/ui", "@elhabak/contracts"],
  headers() {
    const headers = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        // microphone/camera must allow self: the chat voice recorder uses getUserMedia and
        // the mobile site-update form uses a camera-capture file input.
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(self), geolocation=(), payment=()"
      }
    ];
    // HSTS is only meaningful over HTTPS; sending it on local http dev serves no purpose.
    if (isProduction) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains"
      });
    }
    return [{ source: "/(.*)", headers }];
  }
};

export default nextConfig;
