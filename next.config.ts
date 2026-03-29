import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Avoid broken ./vendor-chunks/prop-types.js resolution from transitive deps (recharts, dropzone, etc.). */
  serverExternalPackages: ["prop-types"],
  experimental: {
    serverActions: {
      /** Match STRATEGY_UPLOAD_MAX_BYTES — default Next limit (~1mb) can drop file uploads. */
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
