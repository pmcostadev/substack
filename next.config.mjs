/** @type {import('next').NextConfig} */
const nextConfig = {
  // The src/ directory contains plain ESM .js files from the upstream substack-mcp.
  // They use node:dns, node:fs/promises etc. which only run in Node.js.
  serverExternalPackages: [],
};

export default nextConfig;
