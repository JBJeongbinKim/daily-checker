import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return ["/workout", "/mercor", "/rent"].map((source) => ({
      source,
      destination: "/jackpot",
      permanent: false
    }));
  },
  outputFileTracingIncludes: {
    "/api/mercor/refresh": [
      "./node_modules/@sparticuz/chromium/bin/**/*"
    ]
  }
};

export default nextConfig;
