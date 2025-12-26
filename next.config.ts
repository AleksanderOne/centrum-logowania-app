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
};

export default nextConfig;
