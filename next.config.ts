import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'timberedgroup.com' },
    ],
  },
  // Allow phones/tablets on the LAN to load dev assets (/_next/*, HMR socket).
  // Without this, the page server-renders but never hydrates — nothing is clickable.
  allowedDevOrigins: ['192.168.1.7', '192.168.1.*'],
  // The project sits under a parent folder with no lockfile, so Turbopack was
  // inferring the workspace root one level up and failing to resolve tailwindcss.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
