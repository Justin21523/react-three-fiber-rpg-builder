/* eslint-disable react-hooks/set-state-in-effect -- setState fires only from async Image.onload/onerror */
import { useEffect, useState } from 'react';

// Kit — lazily downscale a (possibly 4K) texture into a small cached data-URL thumbnail, so the editor's
// texture grid never holds dozens of full-resolution images in memory. The full image is decoded at most
// ONCE per url (to produce the thumb); the small result is cached and reused everywhere after.
const cache = new Map<string, string>();

export function useTextureThumb(url: string | undefined, size = 128): string | undefined {
  const [thumb, setThumb] = useState<string | undefined>(() => (url ? cache.get(url) : undefined));

  useEffect(() => {
    if (!url) return;
    const cached = cache.get(url);
    if (cached) { setThumb(cached); return; }
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const ar = img.width && img.height ? img.width / img.height : 1;
        const w = size;
        const h = Math.max(1, Math.round(size / ar));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { if (!cancelled) setThumb(url); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const data = canvas.toDataURL('image/jpeg', 0.72);
        cache.set(url, data);
        if (!cancelled) setThumb(data);
      } catch {
        // Tainted canvas / decode error → fall back to the original url.
        if (!cancelled) setThumb(url);
      }
    };
    img.onerror = () => { if (!cancelled) setThumb(undefined); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url, size]);

  return thumb;
}
