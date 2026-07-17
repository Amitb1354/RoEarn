import React from 'react';

/**
 * Renders a 160x600 skyscraper ad slot.
 * `position` can be "left" or "right" – used only for styling.
 * Hidden on mobile via Tailwind utility classes.
 */
export default function SkyscraperAd({ position }) {
  const placeholderUrl = `https://via.placeholder.com/160x600?text=Ad+${position}`;
  return (
    <div className={`hidden md:block ${position === 'left' ? 'mr-4' : 'ml-4'}`}>
      <img src={placeholderUrl} alt={`Skyscraper ad ${position}`} width={160} height={600} />
    </div>
  );
}
