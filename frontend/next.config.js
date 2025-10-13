/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración de PWA
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
  },
  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: true, // Temporalmente ignorar errores de TypeScript
  },
  // Configuración de imágenes
  images: {
    domains: ['localhost'], // Añade aquí los dominios de tus imágenes
  },
};

export default nextConfig;