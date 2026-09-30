import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor mínimo em .next/standalone, com só as dependências usadas:
  // a imagem Docker não precisa carregar o node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
