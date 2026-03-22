import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Plugin next-intl — charge la configuration i18n depuis src/i18n/request.ts
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Optimisation images : Supabase Storage comme source externe
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
