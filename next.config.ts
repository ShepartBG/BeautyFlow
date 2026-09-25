import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    // Supabase serves public media directly. Proxying through Next timed out
    // on the first uncached request and returned a broken image in development.
    unoptimized: true,
  },
};

export default nextConfig;
