'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Returns `true` when the user scrolls DOWN past a threshold, `false` when
 * they scroll back up. Used to auto-retract the sticky admin topbar.
 *
 * @param threshold      Minimum pixels scrolled before hiding (default 80)
 * @param deltaThreshold Minimum delta to count as a direction change (default 8)
 */
export function useScrollDirection(threshold = 80, deltaThreshold = 8): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY || 0;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const delta = y - lastY.current;

        if (y < threshold) {
          setHidden(false);
        } else if (Math.abs(delta) >= deltaThreshold) {
          setHidden(delta > 0);
        }

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, deltaThreshold]);

  return hidden;
}
