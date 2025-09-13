import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  // Disable image optimization for IIS compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
