import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SITE_ORIGIN, useSeo, type SeoOptions } from '../hooks/useSeo';

function Probe(options: SeoOptions) {
  useSeo(options);
  return null;
}

function canonicalHref(): string | null {
  return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
}

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('useSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets the title, description and canonical link', () => {
    render(<Probe title="Holdem Timer" description="A poker blind timer." canonical={`${SITE_ORIGIN}/`} />);

    expect(document.title).toBe('Holdem Timer');
    expect(metaContent('meta[name="description"]')).toBe('A poker blind timer.');
    expect(canonicalHref()).toBe('https://holdem-timer.com/');
  });

  it('mirrors the title and description into the Open Graph tags', () => {
    render(<Probe title="Settings" description="Edit blind structures." canonical={`${SITE_ORIGIN}/settings`} />);

    expect(metaContent('meta[property="og:title"]')).toBe('Settings');
    expect(metaContent('meta[property="og:description"]')).toBe('Edit blind structures.');
    expect(metaContent('meta[property="og:url"]')).toBe('https://holdem-timer.com/settings');
  });

  it('reuses the existing canonical link instead of adding a second one', () => {
    const existing = document.createElement('link');
    existing.setAttribute('rel', 'canonical');
    existing.setAttribute('href', 'https://holdem-timer.com/');
    document.head.appendChild(existing);

    render(<Probe title="Settings" description="Edit blind structures." canonical={`${SITE_ORIGIN}/settings`} />);

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonicalHref()).toBe('https://holdem-timer.com/settings');
  });

  it('emits robots noindex and no canonical for a noindex route', () => {
    render(<Probe title="Page not found" description="Nothing here." noindex />);

    expect(metaContent('meta[name="robots"]')).toBe('noindex');
    expect(canonicalHref()).toBeNull();
  });

  it('removes the robots noindex tag when navigating back to an indexable route', () => {
    const { rerender } = render(<Probe title="Page not found" description="Nothing here." noindex />);
    expect(metaContent('meta[name="robots"]')).toBe('noindex');

    rerender(<Probe title="Holdem Timer" description="A poker blind timer." canonical={`${SITE_ORIGIN}/`} />);

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(canonicalHref()).toBe('https://holdem-timer.com/');
  });
});
