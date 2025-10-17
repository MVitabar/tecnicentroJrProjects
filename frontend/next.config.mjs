/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración de imágenes
  images: {
    domains: [
      'localhost',
      'imgaohzjravmwqklitpq.supabase.co',
      'imgaohzjravmwqklitpq.supabase.in'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imgaohzjravmwqklitpq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/services/images/**',
      },
    ],
  },
};

export default nextConfig;
