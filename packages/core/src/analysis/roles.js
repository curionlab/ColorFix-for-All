export function inferSemanticRole(element) {
    const tag = (element.tagName || '').toLowerCase();
    if (tag === 'a')
        return 'link';
    if (tag === 'button' || (tag === 'input' && (element.type === 'button' || element.type === 'submit')))
        return 'button';
    if (element.className && element.className.includes('btn'))
        return 'button';
    if (['p', 'span', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'].includes(tag))
        return 'text';
    if (element.hasBackground || ['div', 'section', 'header', 'footer', 'main', 'nav', 'aside'].includes(tag))
        return 'background';
    return 'unknown';
}
export function inferRoles(elements) {
    return elements.map(el => ({
        ...el,
        role: el.role === 'unknown' ? inferSemanticRole(el) : el.role
    }));
}
export function scoreRoleConfidence(element) {
    const role = inferSemanticRole(element);
    if (role === 'unknown')
        return 0;
    if (['a', 'button'].includes(element.tagName.toLowerCase()))
        return 0.9;
    if (element.hasBackground)
        return 0.8;
    return 0.5;
}
