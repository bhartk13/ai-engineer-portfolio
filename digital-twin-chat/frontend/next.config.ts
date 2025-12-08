import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for deployment to S3/CloudFront
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Configure trailing slashes for consistent routing
  trailingSlash: true,
};

export default nextConfig;
