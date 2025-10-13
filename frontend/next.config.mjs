/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración de imágenes
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
