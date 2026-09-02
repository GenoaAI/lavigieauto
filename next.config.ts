import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // Évite la fuite de métadonnées X-Powered-By: Next.js
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Autorise les uploads de factures/PV haute résolution
    },
  },
  outputFileTracingIncludes: {
    "/**": ["./skills/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
