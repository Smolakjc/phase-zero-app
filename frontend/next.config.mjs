/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@phase-zero/shared"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
