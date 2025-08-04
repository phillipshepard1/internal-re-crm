import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable React Strict Mode for React 19 compatibility
  reactStrictMode: false,
  
  // Enable experimental features for React 19
  experimental: {
    // Optimize for React 19
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb'
    },
    
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1
  },
  
  // Reduce build memory consumption
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  
  // Webpack configuration for better React 19 support
  webpack: (config, { dev, isServer }) => {
    // Optimize for React 19
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
  
  // TypeScript configuration
  typescript: {
    // Don't fail build on TypeScript errors in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  // ESLint configuration
  eslint: {
    // Don't fail build on ESLint errors in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for better security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
