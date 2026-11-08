import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Route Planner — Rutas inteligentes',
  description: 'Planifica rutas para reparto y transporte pesado con perfiles de vehículo y múltiples paradas.',
  applicationName: 'Route Planner',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Route Planner' },
};

export const viewport: Viewport = {
  themeColor: '#174b3c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
