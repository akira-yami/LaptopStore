import { useEffect, useState } from 'react';

export function useHeaderScrolled() {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  return scrolled;
}
