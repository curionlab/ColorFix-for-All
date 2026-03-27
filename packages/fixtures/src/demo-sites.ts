import { DesignInput } from '@colorfix/schemas';

export const demoSites: Record<string, DesignInput> = {
  'corp-site': {
    url: 'https://corp-example.js',
    sourceType: 'web',
    sourceUrl: 'https://corp-example.js',
    elements: [
      {
        id: 'header-bg',
        selectorHint: 'header',
        tagName: 'header',
        role: 'background',
        background: '#ffffff',
        importance: 'high'
      },
      {
        id: 'nav-link',
        selectorHint: 'nav a',
        tagName: 'a',
        role: 'link',
        foreground: '#6B7280', // Low contrast gray on white
        background: '#ffffff',
        importance: 'medium'
      },
      {
        id: 'hero-button',
        selectorHint: '.btn-primary',
        tagName: 'button',
        role: 'button',
        foreground: '#ffffff',
        background: '#3B82F6', // Brand blue
        importance: 'high'
      }
    ],
    declaredColors: [
      { value: '#3B82F6', source: 'style-tag', count: 5 },
      { value: '#ffffff', source: 'inline', count: 12 }
    ]
  }
};
