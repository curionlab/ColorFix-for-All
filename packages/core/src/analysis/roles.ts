import { SemanticRole, SemanticElement } from '@colorfix/schemas';

export type RawElementLike = {
  tagName:       string;
  id?:           string;
  className?:    string;
  inputType?:    string;   // 旧: type → inputType に統一
  hasBackground?: boolean;
};

export function inferSemanticRole(element: RawElementLike): SemanticRole {
  const tag = (element.tagName || '').toLowerCase();

  if (tag === 'a') return 'link';

  if (
    tag === 'button' ||
    (tag === 'input' && ['button', 'submit', 'reset'].includes(element.inputType ?? ''))
  ) return 'button';

  // btn クラスを持つ要素もボタン扱い
  if (element.className?.split(/\s+/).some(c => /^btn(-|$)/i.test(c))) return 'button';

  if (['p', 'span', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'td', 'th'].includes(tag)) {
    return 'text';
  }

  if (
    element.hasBackground ||
    ['div', 'section', 'header', 'footer', 'main', 'nav', 'aside', 'article', 'body'].includes(tag)
  ) return 'background';

  return 'unknown';
}

export function inferRoles(elements: SemanticElement[]): SemanticElement[] {
  return elements.map(el => {
    const hasBackground = !!el.background;
    const role = el.role === 'unknown'
      ? inferSemanticRole({ ...el, hasBackground, inputType: el.inputType })
      : el.role;
    return { ...el, hasBackground, role };
  });
}

export function scoreRoleConfidence(element: RawElementLike): number {
  const role = inferSemanticRole(element);
  if (role === 'unknown') return 0;
  if (['a', 'button'].includes(element.tagName.toLowerCase())) return 0.9;
  if (element.hasBackground) return 0.8;
  return 0.5;
}
