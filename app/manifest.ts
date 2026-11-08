import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Route Planner',
    short_name: 'Route Planner',
    description: 'Planifica rutas para reparto y transporte pesado.',
    lang: 'es-MX',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f7f8f5',
    theme_color: '#174b3c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
