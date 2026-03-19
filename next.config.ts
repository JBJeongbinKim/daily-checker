import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/mercor/refresh": [
      "./node_modules/@sparticuz/chromium/bin/**/*"
    ]
  }
};

export default nextConfig;
