import { useEffect } from 'react';

/** Absolute origin used for every canonical URL we emit. Keeping it absolute
 * (and always https) is what tells Google that http://, https://www. and
 * /index.html variants are all the same page. */
export const SITE_ORIGIN = 'https://holdem-timer.com';

export interface SeoOptions {
  /** Full value for `document.title`. */
  title: string;
  /** Value for `<meta name="description">`. */
  description: string;
  /**
   * Absolute URL for `<link rel="canonical">`. Omit it for pages that must
   * not be indexed (the 404 route) — a canonical on an error page is what
   * makes Google treat unknown paths as duplicates of the home page.
   */
  canonical?: string;
  /** When true, emits `<meta name="robots" content="noindex">`. */
  noindex?: boolean;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function removeMeta(attribute: 'name' | 'property', key: string): void {
  document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();
}

function setCanonical(href: string | undefined): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!href) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement('link');
  element.setAttribute('rel', 'canonical');
  element.setAttribute('href', href);

  if (!existing) {
    document.head.appendChild(element);
  }
}

/**
 * Keeps the document title, meta description, canonical link and robots
 * directive in sync with the active route.
 *
 * Every call reconciles all four, so navigating from a `noindex` route back to
 * an indexable one removes the robots tag and restores the canonical link
 * without needing a cleanup function.
 */
export function useSeo({ title, description, canonical, noindex = false }: SeoOptions): void {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);

    if (canonical) {
      upsertMeta('property', 'og:url', canonical);
    }

    setCanonical(canonical);

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex');
    } else {
      removeMeta('name', 'robots');
    }
  }, [title, description, canonical, noindex]);
}
