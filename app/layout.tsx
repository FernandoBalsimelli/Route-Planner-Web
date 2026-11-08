import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Route Planner — Rutas inteligentes',
  description: 'Planifica rutas para reparto y transporte pesado con perfiles de vehículo.',
  applicationName: 'Route Planner',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
