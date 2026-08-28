import path from "node:path";
import type { NextConfig } from "next";
import { employeeSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: employeeSecurityHeaders({
          appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
          apiBaseUrl:
            process.env.NEXT_PUBLIC_API_BASE_URL ??
            "http://localhost:3002/api/v1",
        }),
      },
    ];
  },
};

export default nextConfig;
