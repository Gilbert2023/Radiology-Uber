/** Static export: the MVP needs no server, so it can be hosted on any static host. */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
