// web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Evita que ESLint detenga el build en producción
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
