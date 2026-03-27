import { SemanticElement, ExtractedColor } from '@colorfix/schemas';

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────

const NAMED_COLORS: Record<string, string> = {
  white: '#FFFFFF', black: '#000000', transparent: 'transparent',
  red: '#FF0000', green: '#008000', blue: '#0000FF', yellow: '#FFFF00',
  cyan: '#00FFFF', magenta: '#FF00FF', silver: '#C0C0C0', gray: '#808080',
  grey: '#808080', maroon: '#800000', olive: '#808000', navy: '#000080',
  purple: '#800080', teal: '#008080', orange: '#FFA500', pink: '#FFC0CB',
  lime: '#00FF00', fuchsia: '#FF00FF', aqua: '#00FFFF',
};

// ─────────────────────────────────────────
// アルファ合成（Porter-Duff Source-over）
// rgba() を背景色と合成して不透明HEXを返す
// 背景が不明な場合は白（#FFFFFF）を仮定
// ─────────────────────────────────────────

function blendAlpha(
  r: number, g: number, b: number, a: number,
  bgHex: string = '#FFFFFF'
): string {
  const br = parseInt(bgHex.slice(1, 3), 16);
  const bg_ = parseInt(bgHex.slice(3, 5), 16);
  const bb = parseInt(bgHex.slice(5, 7), 16);
  const ro = Math.round(a * r + (1 - a) * br);
  const go = Math.round(a * g + (1 - a) * bg_);
  const bo = Math.round(a * b + (1 - a) * bb);
  return `#${ro.toString(16).padStart(2, '0')}${go.toString(16).padStart(2, '0')}${bo.toString(16).padStart(2, '0')}`.toUpperCase();
}

// ─────────────────────────────────────────
// グラデーション専用パーサ（resolveColor との相互再帰なし）
// ─────────────────────────────────────────

function extractFirstColorFromGradient(gradientStr: string): string | undefined {
  const colorTokenRegex = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g;
  const tokens = gradientStr.match(colorTokenRegex);
  if (tokens) {
    for (const t of tokens) {
      const r = resolveColor(t);
      if (r && r !== 'transparent') return r;
    }
  }
  // HEX/rgb がなければ NAMED_COLORS だけ探す
  for (const m of gradientStr.matchAll(/\b([a-z]+)\b/gi)) {
    const c = m[1].toLowerCase();
    if (NAMED_COLORS[c] && NAMED_COLORS[c] !== 'transparent') return NAMED_COLORS[c];
  }
  return undefined;
}

// ─────────────────────────────────────────
// 色文字列の正規化
// 戻り値は常に不透明な #RRGGBB または undefined
// bgHex: rgba() を合成するときの背景色（省略時は白）
// ─────────────────────────────────────────

function resolveColor(
  color: string | null | undefined,
  bgHex?: string
): string | undefined {
  if (!color) return undefined;
  const val = color.trim();

  // グラデーション → 専用パーサに委譲（再帰しない）
  if (/gradient/i.test(val)) return extractFirstColorFromGradient(val);

  const lower = val.toLowerCase();

  // named color
  if (lower in NAMED_COLORS) {
    const mapped = NAMED_COLORS[lower];
    return mapped === 'transparent' ? undefined : mapped;
  }

  // HEX（3/4/6/8桁）
  const hexMatch = val.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) {
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
    }
    if (h.length === 4) {
      // #RGBA → アルファを合成
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = parseInt(h[3] + h[3], 16) / 255;
      return a >= 0.99 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase()
                       : blendAlpha(r, g, b, a, bgHex);
    }
    if (h.length === 8) {
      // #RRGGBBAA → アルファを合成
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = parseInt(h.slice(6, 8), 16) / 255;
      return a >= 0.99 ? `#${h.slice(0, 6)}`.toUpperCase()
                       : blendAlpha(r, g, b, a, bgHex);
    }
    return `#${h}`.toUpperCase();
  }

  // rgb() / rgba()
  const rgbMatch = val.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)
                ?? val.match(/^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
  if (rgbMatch) {
    const parseChannel = (v: string) =>
      v.endsWith('%') ? Math.round(parseFloat(v) * 2.55) : parseInt(v, 10);
    const r = parseChannel(rgbMatch[1]);
    const g = parseChannel(rgbMatch[2]);
    const b = parseChannel(rgbMatch[3]);
    const rawA = rgbMatch[4];
    const a = rawA === undefined ? 1
            : rawA.endsWith('%') ? parseFloat(rawA) / 100
            : parseFloat(rawA);
    if (a >= 0.99) {
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase();
    }
    return blendAlpha(r, g, b, a, bgHex);
  }

  // hsl() / hsla()
  const hslMatch = val.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i)
                ?? val.match(/^hsla?\(\s*([\d.]+(?:deg|rad|turn)?)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) % 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const rawA = hslMatch[4];
    const a = rawA === undefined ? 1
            : rawA.endsWith('%') ? parseFloat(rawA) / 100
            : parseFloat(rawA);
    // HSL → RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)        { r = c; g = x; b = 0; }
    else if (h < 120)  { r = x; g = c; b = 0; }
    else if (h < 180)  { r = 0; g = c; b = x; }
    else if (h < 240)  { r = 0; g = x; b = c; }
    else if (h < 300)  { r = x; g = 0; b = c; }
    else               { r = c; g = 0; b = x; }
    const ri = Math.round((r + m) * 255);
    const gi = Math.round((g + m) * 255);
    const bi = Math.round((b + m) * 255);
    if (a >= 0.99) {
      return `#${ri.toString(16).padStart(2,'0')}${gi.toString(16).padStart(2,'0')}${bi.toString(16).padStart(2,'0')}`.toUpperCase();
    }
    return blendAlpha(ri, gi, bi, a, bgHex);
  }

  // CSS color-mix() などの未対応構文は undefined
  return undefined;
}

// ─────────────────────────────────────────
// CSS 宣言ブロックのパース
// ─────────────────────────────────────────

interface ParsedStyle {
  fg?:          string;
  bg?:          string;
  border?:      string;
  fontSize?:    string;
  fontWeight?:  string;
  fontSizeUnit?: 'px' | 'pt' | 'rem' | 'em';
}

function parseDeclarations(declarations: string, bgHex?: string): ParsedStyle {
  // color: は background より前に評価（bgHex を bg から引き継ぐため bg を先に抽出）
  const bgRaw     = declarations.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;}\n]+)/i)?.[1]?.trim();
  const fgRaw     = declarations.match(/(?:^|;)\s*color\s*:\s*([^;}\n]+)/i)?.[1]?.trim();
  const borderRaw = declarations.match(/(?:^|;)\s*(?:border(?:-color)?|outline(?:-color)?)\s*:\s*([^;}\n]+)/i)?.[1]?.trim();
  const fsSizeMatch  = declarations.match(/(?:^|;)\s*font-size\s*:\s*([\d.]+)(px|pt|rem|em)/i);
  const fwMatch      = declarations.match(/(?:^|;)\s*font-weight\s*:\s*([^;}\n]+)/i);

  // bg を先に解決して rgba() の合成ベース色として fg/border に引き継ぐ
  const bg     = bgRaw     ? resolveColor(bgRaw, bgHex)     : undefined;
  const bgBase = bg ?? bgHex;
  const fg     = fgRaw     ? resolveColor(fgRaw, bgBase)    : undefined;
  const border = borderRaw ? resolveColor(borderRaw, bgBase): undefined;

  return {
    fg, bg, border,
    fontSize:     fsSizeMatch ? fsSizeMatch[1] : undefined,
    fontSizeUnit: fsSizeMatch ? fsSizeMatch[2] as any : undefined,
    fontWeight:   fwMatch     ? fwMatch[1].trim() : undefined,
  };
}

// ─────────────────────────────────────────
// スタイルのマージ（上書き）
// ─────────────────────────────────────────

function mergeStyle(el: SemanticElement, style: ParsedStyle) {
  if (style.fg)           el.foreground   = style.fg;
  if (style.bg)           el.background   = style.bg;
  if (style.border)       el.borderColor  = style.border;
  if (style.fontSize)     el.fontSize     = style.fontSize;
  if (style.fontSizeUnit) el.fontSizeUnit = style.fontSizeUnit;
  if (style.fontWeight)   el.fontWeight   = style.fontWeight;
}

function addColorToMap(color: string, map: Map<string, number>) {
  if (!color || color === 'transparent') return;
  const val = color.toUpperCase();
  // HEXのみ正規化済みとして追跡（rgb/hsl は resolveColor が HEX に変換済み）
  if (val.startsWith('#')) {
    map.set(val, (map.get(val) ?? 0) + 1);
  }
}

// ─────────────────────────────────────────
// メイン
// ─────────────────────────────────────────

const SELECTOR =
  'body, main, section, header, footer, nav, article, aside, ' +
  'div, p, a, button, input, textarea, select, ' +
  'h1, h2, h3, h4, h5, h6, span, label, li, ul, ol, table, thead, tbody, tr, th, td';

export async function extractDesignInput(response: Response): Promise<{
  elements: SemanticElement[];
  declaredColors: ExtractedColor[];
  assets: { html: string; css: string };
}> {
  const elements: SemanticElement[]             = [];
  const inlineStylesMap = new Map<string, ParsedStyle>();
  const colorMap        = new Map<string, number>();
  let   styleContent    = '';

  const rewriter = new (globalThis as any).HTMLRewriter()
    .on('style', {
      text(text: any) {
        if (text.content) styleContent += text.content;
      },
    })
    .on(SELECTOR, {
      element(el: any) {
        const tagName   = el.tagName.toLowerCase();
        const className = el.getAttribute('class') || '';
        const id        = el.getAttribute('id')    || '';
        const styleAttr = el.getAttribute('style') || '';
        const inputType = (tagName === 'input' || tagName === 'button')
          ? (el.getAttribute('type') ?? undefined)
          : undefined;

        const selectorHint = id
          ? `#${id}`
          : `${tagName}${className ? '.' + className.split(/\s+/)[0] : ''}`;

        const elementId = id || `el-${Math.random().toString(36).slice(2, 11)}`;

        if (styleAttr) {
          inlineStylesMap.set(elementId, parseDeclarations(styleAttr));
        }

        elements.push({
          id: elementId,
          selectorHint,
          tagName,
          className,
          role: 'unknown',
          foreground:   undefined,
          background:   undefined,
          borderColor:  undefined,
          fontSize:     undefined,
          fontWeight:   undefined,
          fontSizeUnit: undefined,
          inputType,
          importance: (tagName === 'h1' || tagName === 'button') ? 'high' : 'medium',
          textSample: '',
        });
      },
      text(text: any) {
        if (elements.length > 0 && text.content) {
          const last = elements[elements.length - 1];
          if ((last.textSample?.length ?? 0) < 30) {
            last.textSample = (last.textSample ?? '') + text.content.trim();
          }
        }
      },
    });

  const html = await rewriter.transform(response).text();

  // ── CSS ルール抽出 ─────────────────────────

  // @media / @keyframes 内のネストブロックを除外するため
  // @ルールを先にまとめて除去してから通常ルールを抽出する
  const strippedCss = styleContent.replace(/@[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');

  const ruleRegex = /([^{}@][^{]*)\{([^}]+)\}/g;
  const tagStyles   = new Map<string, ParsedStyle>();
  const idStyles    = new Map<string, ParsedStyle>();
  const classStyles = new Map<string, ParsedStyle>();
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(strippedCss)) !== null) {
    const selectors    = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const declarations = match[2];
    const style        = parseDeclarations(declarations);

    if (!style.fg && !style.bg && !style.border && !style.fontSize && !style.fontWeight) continue;

    for (const selector of selectors) {
      // 疑似クラス・疑似要素を除去（:hover, ::before など）
      const cleaned = selector.replace(/:{1,2}[\w-()]+/g, '').trim();
      if (!cleaned) continue;

      if (cleaned.startsWith('#')) {
        idStyles.set(cleaned.slice(1), style);
      } else if (cleaned.startsWith('.')) {
        // .class-name のみを対象（複合セレクタ .a.b は最後のクラスを採用）
        const cls = cleaned.split('.').filter(Boolean).pop()!;
        classStyles.set(cls, style);
      } else {
        // 子孫・兄弟結合子を含む複合セレクタは末尾のタグのみを採用
        const parts    = cleaned.split(/[\s>+~]+/);
        const lastPart = parts[parts.length - 1].replace(/\[.*\]/, '').toLowerCase();
        if (/^[a-z][a-z0-9]*$/.test(lastPart)) {
          tagStyles.set(lastPart, style);
        }
      }
    }
  }

  // ── CSS 適用（低優先 → 高優先の順で上書き） ───

  for (const el of elements) {
    // Step 1: タグスタイル
    const tagStyle = tagStyles.get(el.tagName.toLowerCase());
    if (tagStyle) mergeStyle(el, tagStyle);

    // Step 2: クラススタイル（複数クラスは記述順に適用）
    if (el.className) {
      for (const cls of el.className.split(/\s+/).filter(Boolean)) {
        const style = classStyles.get(cls);
        if (style) mergeStyle(el, style);
      }
    }

    // Step 3: ID スタイル
    if (el.id && !el.id.startsWith('el-')) {
      const idStyle = idStyles.get(el.id);
      if (idStyle) mergeStyle(el, idStyle);
    }

    // Step 4: インラインスタイル（最高優先）
    const inline = inlineStylesMap.get(el.id);
    if (inline) mergeStyle(el, inline);

    if (el.foreground)  addColorToMap(el.foreground,  colorMap);
    if (el.background)  addColorToMap(el.background,  colorMap);
    if (el.borderColor) addColorToMap(el.borderColor, colorMap);
  }

  // ── パレット収集（HEX・rgb・hsl・NAMED_COLORS のみ） ──

  const namedPattern = Object.keys(NAMED_COLORS).join('|');
  const palettePattern = new RegExp(
    `#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\)|\\b(?:${namedPattern})\\b`,
    'gi'
  );
  for (const m of styleContent.matchAll(palettePattern)) {
    const resolved = resolveColor(m[0]);
    if (resolved) addColorToMap(resolved, colorMap);
  }

  const declaredColors: ExtractedColor[] = Array.from(colorMap.entries())
    .map(([value, count]) => ({ value, count, source: 'style-tag' as const }))
    .filter(c => c.value.startsWith('#'))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (declaredColors.length === 0) {
    declaredColors.push({ value: '#FFFFFF', count: 1, source: 'computed-like' });
    declaredColors.push({ value: '#000000', count: 1, source: 'computed-like' });
  }

  const coloredElements = elements.filter(
    el => el.foreground || el.background || el.borderColor
  );

  return {
    elements: coloredElements.length > 0 ? coloredElements : elements.slice(0, 10),
    declaredColors,
    assets: {
      html,
      css: styleContent || 'No CSS found in <style> tags',
    },
  };
}
