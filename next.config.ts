import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (and its gRPC/native deps) must not be bundled by the
  // server compiler — keep it external so the Admin SDK runs correctly in
  // Vercel serverless functions (route handlers).
  serverExternalPackages: ["firebase-admin", "mammoth"],
};

export default nextConfig;
