/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker containers, standard output for Vercel
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  reactStrictMode: true,
};

export default nextConfig;

