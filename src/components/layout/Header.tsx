'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cartCount, useCart } from '@/lib/commerce/cart';
import { Wordmark } from '@/components/ui/Wordmark';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop Kites' },
  { href: '/categories', label: 'Categories' },
  { href: '/collections/basant-bundles', label: 'Basant Bundles' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Floating site header.
 *
 * Transparent over the hero and solid once scrolled, as the brief asks. The
 * transparent state is only safe on pages that actually open with a dark 3D
 * scene behind it, so it is opt-in per page via `overHero` rather than
 * assumed — on a white product page, transparent would be invisible text.
 */
export function Header({ overHero = false }: { overHero?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lines = useCart((state) => state.lines);
  const openCart = useCart((state) => state.open);

  // Hydration guard: the cart comes from localStorage, which the server cannot
  // know. Rendering the count before mount would mismatch the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation, or it stays open over the new page.
  useEffect(() => setMenuOpen(false), [pathname]);

  const solid = !overHero || scrolled;
  const count = mounted ? cartCount(lines) : 0;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        solid
          ? 'border-b border-navy-900/10 bg-cream/85 backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className="shell flex h-[var(--nav-h)] items-center justify-between gap-4">
        {/* Two sizes rather than one: the row holds four icon buttons on the
            right (~168px with their gaps), and at `text-3xl` the mark runs
            into them below ~400px. It steps up as soon as there is room. */}
        <Link href="/" aria-label="Kites92 home">
          <Wordmark
            className="text-2xl tracking-tight sm:text-3xl"
            on={solid ? 'light' : 'dark'}
          />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
                      solid
                        ? 'text-navy-900/75 hover:bg-navy-900/5 hover:text-navy-900'
                        : 'text-cream/85 hover:bg-white/10 hover:text-cream',
                      active && (solid ? 'text-royal' : 'text-basant'),
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search products"
            className={cn('rounded-full p-2.5 transition-colors', solid ? 'text-navy-900 hover:bg-navy-900/5' : 'text-cream hover:bg-white/10')}
          >
            <SearchIcon />
          </Link>
          <Link
            href="/account"
            aria-label="Your account"
            className={cn('rounded-full p-2.5 transition-colors', solid ? 'text-navy-900 hover:bg-navy-900/5' : 'text-cream hover:bg-white/10')}
          >
            <UserIcon />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
            className={cn(
              'relative rounded-full p-2.5 transition-colors',
              solid ? 'text-navy-900 hover:bg-navy-900/5' : 'text-cream hover:bg-white/10',
            )}
          >
            <BagIcon />
            {count > 0 && (
              <span className="tnum absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-vibrant px-1 text-[0.65rem] font-bold text-cream">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle menu"
            className={cn(
              'rounded-full p-2.5 transition-colors lg:hidden',
              solid ? 'text-navy-900 hover:bg-navy-900/5' : 'text-cream hover:bg-white/10',
            )}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-navy-900/10 bg-cream/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="shell flex flex-col py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl px-3 py-3 text-sm font-semibold text-navy-900 hover:bg-navy-900/5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

/* Inline icons: six small glyphs do not justify an icon dependency, and
   inlining keeps them tintable by `currentColor`. */

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
