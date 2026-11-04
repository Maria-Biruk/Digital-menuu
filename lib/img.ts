import type { SyntheticEvent } from 'react';

// Shared graceful fallback for broken dish photos (dead Unsplash links,
// missing CDN files). Without it a failed <img> shows the browser's broken
// image icon across the diner menu, kitchen tickets and admin tables.
export const FALLBACK_IMG = '/skill-coffee.jpg';

export function handleImgError(
  e: SyntheticEvent<HTMLImageElement>,
  fallback: string = FALLBACK_IMG,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === '1') return; // avoid loops
  img.dataset.fallbackApplied = '1';
  img.src = fallback;
}
