'use client';

import { useInView } from '@/lib/hooks/useInView';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger in milliseconds, for revealing a list in sequence. */
  delay?: number;
  as?: 'div' | 'li' | 'section' | 'article';
}

/**
 * Reveal content as it scrolls into view.
 *
 * Uses `once: true`, so content that has appeared stays visible. Re-animating
 * on every pass makes a long page feel twitchy and, worse, can hide content
 * from someone scrolling back up to re-read it.
 *
 * Reduced motion is handled in CSS: the global media query collapses the
 * transition to ~0s, so the element simply appears.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '-10% 0px', once: true });
  const Tag = as;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
