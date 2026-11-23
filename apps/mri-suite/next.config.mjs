/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "exceljs", "pg", "bcryptjs"],
  // Files read from disk at runtime must be bundled into the serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/api/export/[report]": ["./node_modules/pdfkit/js/data/**/*", "./public/brand/**/*"],
  },
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } }, // Vercel request body limit is 4.5 MB
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default nextConfig;
