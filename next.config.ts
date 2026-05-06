import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → deployable to any static host (Firebase Hosting, Netlify, Cloudflare Pages, etc.)
  output: "export",
  // Required for static export — disables next/image optimization
  images: { unoptimized: true },
  // Trailing slashes make static hosts (incl. Firebase Hosting) serve /about/index.html cleanly
  trailingSlash: true,
};

export default nextConfig;
