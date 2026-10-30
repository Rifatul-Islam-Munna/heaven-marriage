// Stable selectors for existing JSX text. MongoDB stores overrides only;
// the current markup remains the fallback for missing/removed entries.
export type VisualKind = 'text' | 'placeholder' | 'alt' | 'aria';
export type VisualEntries = Record<string, string>;
export type VisualTarget = {
  node: Text | Element;
  element: HTMLElement;
  kind: VisualKind;
  key: string;
  scope: string;
};
export interface VisualDoc {
  draft: VisualEntries;
  published: VisualEntries;
  updatedAt: string | null;
  publishedAt: string | null;
}
export interface AdminVisualPage {
  path: string;
  page: VisualDoc;
  global: VisualDoc;
}
export interface PublicVisualPage {
  path: string;
  page: VisualEntries;
  global: VisualEntries;
}
export function safeVisualPage(input: string): string | null {
  if (typeof input !== 'string' || input.length > 180) return null;
  const path = input === '/' ? '/' : input.replace(/\/$/, '');
  if (!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(path) ||
      path.split('/').length > 12 || /^\/(?:api|_next)(?:\/|$)/.test(path)) return null;
  return path;
}
function digest(input: string, seed: number) {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function structuralPath(element: Element) {
  const pieces: string[] = [];
  let current: Element | null = element;
  const root = element.closest('[data-visual-global],main') || document.body;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.children, current) as number;
    pieces.push(current.tagName.toLowerCase() + ':' + index);
    current = parent;
  }
  pieces.push(root.tagName.toLowerCase());
  return pieces.reverse().join('/');
}
function eligible(node: Node) {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
  return !!el && !el.closest(
    'script,style,noscript,svg,textarea,pre,code,[contenteditable],[data-visual-editor-ui],[data-visual-noedit]',
  );
}
export function visualTarget(node: Text | Element, kind: VisualKind): VisualTarget | null {
  const element = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
  if (!element || !eligible(node)) return null;
  if (kind === 'text' && (!node.textContent || !node.textContent.trim()) && !originals.has(node)) return null;
  const scope = element.closest('[data-visual-global]') ? '@global' :
    safeVisualPage(window.location.pathname);
  if (!scope) return null;
  const structural = structuralPath(element);
  const textIndex = kind === 'text' ?
    Array.prototype.indexOf.call(element.childNodes, node) as number : -1;
  const raw = structural + '#' + kind + ':' + textIndex;
  const prefix: Record<VisualKind, string> = {
    text: 't', placeholder: 'p', alt: 'a', aria: 'l',
  };
  return {
    node, element, kind, scope,
    key: prefix[kind] + '_' + digest(raw, 2166136261) + digest(raw, 0x9e3779b9),
  };
}
const originals = new WeakMap<Node, string>();
const languageOrigins = new WeakMap<HTMLElement, { dir: string | null; lang: string | null }>();
export function targetValue(target: VisualTarget) {
  if (target.kind === 'text') {
    return (target.node.textContent || '').trim();
  }
  return target.element.getAttribute(target.kind === 'aria' ? 'aria-label' : target.kind) || '';
}
export function originalValue(target: VisualTarget) {
  const stored = originals.get(target.node);
  return (stored === undefined ? targetValue(target) : stored.trim());
}
function setArabicDirection(target: VisualTarget, value: string) {
  if (target.kind !== 'text' || target.element.childNodes.length !== 1) return;
  const el = target.element;
  if (/[\u0600-\u06ff]/.test(value)) {
    if (!languageOrigins.has(el)) languageOrigins.set(el, {
      lang: el.getAttribute('lang'), dir: el.getAttribute('dir'),
    });
    el.classList.add('visual-arabic-copy');
    el.setAttribute('lang', 'ar');
    el.setAttribute('dir', 'auto');
  } else {
    restoreLanguage(el);
  }
}
function restoreLanguage(el: HTMLElement) {
  if (!languageOrigins.has(el)) return;
  const original = languageOrigins.get(el)!;
  el.classList.remove('visual-arabic-copy');
  for (const attr of ['lang', 'dir'] as const) {
    const value = original[attr];
    if (value === null) el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  }
  languageOrigins.delete(el);
}
export function applyVisualValue(target: VisualTarget, value: string) {
  if (target.kind !== 'text') {
    const attr = target.kind === 'aria' ? 'aria-label' : target.kind;
    if (!originals.has(target.node))
      originals.set(target.node, target.element.getAttribute(attr) || '');
    if (target.element.getAttribute(attr) !== value) target.element.setAttribute(attr, value);
    return;
  }
  const textNode = target.node as Text;
  if (!originals.has(textNode)) originals.set(textNode, textNode.nodeValue || '');
  const original = originals.get(textNode) || '';
  const beginning = original.match(/^\s*/)?.[0] || '';
  const ending = original.match(/\s*$/)?.[0] || '';
  const next = beginning + value + ending;
  if (textNode.nodeValue !== next) textNode.nodeValue = next;
  setArabicDirection(target, value);
}
export function restoreVisualValue(target: VisualTarget) {
  const original = originals.get(target.node);
  if (original === undefined) return;
  if (target.kind === 'text') {
    (target.node as Text).nodeValue = original;
    restoreLanguage(target.element);
  } else {
    target.element.setAttribute(target.kind === 'aria' ? 'aria-label' : target.kind, original);
  }
  originals.delete(target.node);
}
