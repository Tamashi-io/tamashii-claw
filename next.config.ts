import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: resolve(__dirname),
  },
  serverExternalPackages: ["ws"],
};

export default nextConfig;
