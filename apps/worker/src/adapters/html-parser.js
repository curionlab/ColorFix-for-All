export async function extractDesignInput(response) {
    const elements = [];
    const declaredColors = [];
    // Best effort extraction using HTMLRewriter
    // In a real app, we'd want to extract computed styles, but that requires a headless browser.
    // For this worker, we'll extract inline styles and common attributes as a demonstration.
    const rewriter = new HTMLRewriter()
        .on('main, section, header, footer, div, p, a, button, h1, h2, h3', {
        element(el) {
            const id = el.getAttribute('id') || `el-${Math.random().toString(36).substr(2, 9)}`;
            const style = el.getAttribute('style') || '';
            // Very basic regex to find colors in inline styles
            const fgMatch = style.match(/color:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\)|hsl\([^)]+\))/i);
            const bgMatch = style.match(/background(?:-color)?:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\)|hsl\([^)]+\))/i);
            elements.push({
                id,
                selectorHint: el.tagName, // Simple hint for now
                tagName: el.tagName,
                role: 'unknown',
                foreground: fgMatch ? fgMatch[1] : '#000000',
                background: bgMatch ? bgMatch[1] : '#ffffff',
                importance: el.tagName === 'h1' || el.tagName === 'button' ? 'high' : 'medium'
            });
        }
    });
    await rewriter.transform(response).text();
    return { elements, declaredColors };
}
