
import type {NextConfig} from 'next';

// When running in a development server, the hostname is not 'localhost'.
// We need to log the hostname to the console so that we can add it to the
// list of authorized domains in the Firebase console.
if (process.env.HOSTNAME) {
  console.log(`INFO: Development server hostname is: ${process.env.HOSTNAME}`);
  console.log(`INFO: To fix 'auth/unauthorized-domain' errors, add this domain to the Firebase console's list of authorized domains.`);
}


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
