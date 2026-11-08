import type { NextConfig } from 'next';

// Baked into the build by `next build`; setting it at runtime does nothing.
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  agentRules: false,
  rewrites: () => Promise.resolve([{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]),
};

export default nextConfig;
