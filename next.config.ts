
import type {NextConfig} from 'next';

// When running in a development server, the hostname is not 'localhost'.
// We need to log the hostname to the console so that we can add it to the
// list of authorized domains in the Firebase console.
if (process.env.HOSTNAME) {
  console.log(`
[INFO] Firebase Development Environment Detected
[INFO] Hostname: ${process.env.HOSTNAME}
[ACTION REQUIRED] To enable Firebase Authentication (including Google/Facebook sign-in), you MUST add the hostname above to the list of authorized domains in your Firebase project's settings.
[INFO] Go to Firebase Console > Authentication > Settings > Authorized domains > Add domain.
  `);
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
