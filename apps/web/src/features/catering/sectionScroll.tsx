import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const CATALOG_SECTION_ID = 'katalog';
export const REQUEST_SECTION_ID = 'catering-sorov';

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Scrolls to a section on the current page; returns false when it is not on this page. */
export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  return true;
}

interface SectionLinkProps {
  sectionId: string;
  className?: string;
  ariaLabel?: string;
  /** Runs before scrolling or navigating, e.g. to remember what was picked. */
  onNavigate?: () => void;
  children: ReactNode;
}

/** Scrolls in place when the section is on this page, otherwise opens it on the home page. */
export function SectionLink({
  sectionId,
  className,
  ariaLabel,
  onNavigate,
  children,
}: SectionLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    if (scrollToSection(sectionId)) event.preventDefault();
  };
  return (
    <Link to={`/#${sectionId}`} onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}

/** Brings a `/#section` link into view after navigation (the router does not do it). */
export function useHashScroll(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) scrollToSection(hash.slice(1));
  }, [hash]);
}
