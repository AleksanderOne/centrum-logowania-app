import type { NextConfig } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';

// Pobieramy wersję z package.json podczas buildu
const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async headers() {
    const corsHeaders = [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
    ];
    return [
      { source: '/api/health', headers: corsHeaders },
      { source: '/api/v1/projects/claim', headers: corsHeaders },
      { source: '/api/v1/public/:path*', headers: corsHeaders },
    ];
  },
};

export default nextConfig;
