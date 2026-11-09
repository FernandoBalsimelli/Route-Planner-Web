import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Route Planner',
    short_name: 'Routes',
    description: 'Planifica rutas para reparto y transporte pesado.',
    lang: 'es-MX',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f3f4f8',
    theme_color: '#5451c9',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
