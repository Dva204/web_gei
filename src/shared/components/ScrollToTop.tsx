'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // A foolproof way to check scroll: look at the header. 
    // If the header is out of view, we've scrolled down.
    const header = document.querySelector('header');
    if (!header) {
      // Fallback if no header found
      const handleScroll = () => setIsVisible(window.scrollY > 100);
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    // Try to scroll the window
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Fallback: scroll the main element if it's the scroll container
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-[130px] right-4 sm:bottom-8 sm:right-8 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label="Về đầu trang"
    >
      <ArrowUp size={24} />
    </button>
  );
}
