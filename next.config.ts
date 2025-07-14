import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Handle OAuth redirects better
  async redirects() {
    return [
      {
        source: '/dashboard#',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
