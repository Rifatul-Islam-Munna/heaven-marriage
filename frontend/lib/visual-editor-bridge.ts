// postMessage protocol between /dashboard/visual-editor (parent) and a
// same-origin page opened with ?visualEdit=1 inside its preview iframe.
import type { VisualKind } from './visual-content';

export const VISUAL_EDITOR_CHANNEL = 'niqaha-visual-editor';

export type VisualSelection = {
  scope: string; key: string; kind: VisualKind; original: string; value: string;
};
export type FrameToEditor =
  | { type: 'ready'; path: string }
  | { type: 'select'; selection: VisualSelection }
  | { type: 'deselect' }
  | { type: 'busy'; busy: boolean }
  | { type: 'saved'; scope: string; key: string; removed: boolean; message: string }
  | { type: 'error'; message: string }
  | { type: 'hint'; message: string };
export type EditorToFrame =
  | { type: 'preview'; value: string }
  | { type: 'save'; value: string }
  | { type: 'restore' }
  | { type: 'deselect' };

export function isEmbeddedFrame() {
  if (typeof window === 'undefined') return false;
  try { return window.self !== window.top; } catch { return true; }
}

export function postToEditor(message: FrameToEditor) {
  if (!isEmbeddedFrame()) return;
  window.parent.postMessage({ channel: VISUAL_EDITOR_CHANNEL, ...message }, window.location.origin);
}

export function postToFrame(frame: HTMLIFrameElement | null, message: EditorToFrame) {
  frame?.contentWindow?.postMessage({ channel: VISUAL_EDITOR_CHANNEL, ...message }, window.location.origin);
}

/** Accept only same-origin messages on our channel from the expected window. */
export function readBridgeMessage<T extends { type: string }>(event: MessageEvent, source: Window | null | undefined): T | null {
  if (event.origin !== window.location.origin || !source || event.source !== source) return null;
  const data = event.data as { channel?: string; type?: unknown } | null;
  if (!data || data.channel !== VISUAL_EDITOR_CHANNEL || typeof data.type !== 'string') return null;
  return data as unknown as T;
}
