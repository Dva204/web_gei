import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  // Allow only explicitly configured tunnel hostnames, not all public ngrok users.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean),
};
export default config;
