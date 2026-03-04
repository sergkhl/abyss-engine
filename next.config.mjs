/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export',
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': ['./subjects/**/*'],
  },
}

export default nextConfig
