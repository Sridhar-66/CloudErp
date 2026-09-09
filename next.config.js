/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Run lint separately; skip during build to avoid eslint version issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Still fail on type errors
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
