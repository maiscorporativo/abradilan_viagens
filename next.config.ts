import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // O servidor de build da Hostinger informa ~60 CPUs, mas limita processos:
    // com um worker por CPU o build aborta (SIGABRT). Poucos workers bastam.
    cpus: 2,
    serverActions: {
      // uploads de PDFs de template e documentos de passageiros (até 15 MB
      // por arquivo + overhead do multipart)
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
