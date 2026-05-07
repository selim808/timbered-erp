import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'timberedgroup.com' },
    ],
  },
};

export default nextConfig;
