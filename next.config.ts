import type {NextConfig} from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => {
  const config: any = {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    // Allow access to remote image placeholder.
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
          port: '',
          pathname: '/**', // This allows any path under the hostname
        },
      ],
    },
    output: 'standalone',
    transpilePackages: ['motion'],
    webpack: (config: any, {dev}: any) => {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      if (dev && process.env.DISABLE_HMR === 'true') {
        config.watchOptions = {
          ignored: /.*/,
        };
      }
      return config;
    },
  };

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config.experimental = {
      ...config.experimental,
      allowedDevOrigins: [
        'ais-dev-6mhikckr7w4iqvpmsshelf-656050679822.asia-southeast1.run.app',
        'ais-pre-6mhikckr7w4iqvpmsshelf-656050679822.asia-southeast1.run.app',
        'localhost:3000'
      ]
    };
  }

  return config;
};

export default nextConfig;
