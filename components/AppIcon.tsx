import React from 'react';

const paths = {
  route: 'M4 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0M14 7a3 3 0 1 0 6 0 3 3 0 1 0-6 0M7 14V7a3 3 0 0 1 3-3h4m3 6v7a3 3 0 0 1-3 3h-4',
  plan: 'M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  saved: 'M6 3h12v18l-6-4-6 4V3Z',
  truck: 'M3 6h11v11H3V6Zm11 4h4l3 4v3h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  moon: 'M20 14a8 8 0 0 1-10-10 9 9 0 1 0 10 10Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  check: 'm5 12 4 4L19 6',
} as const;

export default function AppIcon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
