// web/src/components/common/SafeImage.tsx
import React, { useState } from 'react';

export function SafeImage({ src, alt, className, fallback }: { src?: string; alt?: string; className?: string; fallback?: string }) {
  const [ok, setOk] = useState(true);
  const handleError = () => setOk(false);
  const showSrc = ok && src ? src : (fallback || '/assets/images/albums/afrodisia-cover.jpg');
  return <img src={showSrc} alt={alt} className={className} onError={handleError} />;
}
