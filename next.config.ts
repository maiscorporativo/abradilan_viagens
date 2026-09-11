import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // uploads de PDFs de template e documentos de passageiros (até 15 MB
      // por arquivo + overhead do multipart)
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
