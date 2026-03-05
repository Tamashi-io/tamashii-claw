import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  env: {
    NEXT_PUBLIC_TAMASHIICLAW_API_URL:
      process.env.TAMASHIICLAW_API_URL || process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "",
    NEXT_PUBLIC_TAMASHIICLAW_MODELS_URL:
      process.env.TAMASHIICLAW_MODELS_URL || process.env.NEXT_PUBLIC_TAMASHIICLAW_MODELS_URL || "",
  },
};

export default nextConfig;
