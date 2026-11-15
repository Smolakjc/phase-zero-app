/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(frontendDirectory, ".."),
  },
  transpilePackages: ["@phase-zero/shared"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
