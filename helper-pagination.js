import {INITIALS, FINALS} from './helper-core.js?v=20261022-common1';

// Two rows per group; never hide touch targets in a scrolling tray.
export function symbolPageSize(width) { return width <= 900 ? 10 : 12; }
export function symbolPage(kind, requested = 0, pageSize = 12) {
  const all = kind === 'initial' ? ['', ...INITIALS]
    : kind === 'final' ? ['', ...FINALS] : kind === 'tone' ? [1,2,3,4,5] : [];
  const size = Math.max(1, Math.floor(Number(pageSize) || 12));
  const count = Math.max(1, Math.ceil(all.length / size));
  const page = Math.max(0, Math.min(count - 1, Math.floor(Number(requested) || 0)));
  return {page, count, values: all.slice(page * size, (page + 1) * size)};
}
export function resizeSymbolPage(page, oldSize, newSize) {
  return Math.floor(page * oldSize / newSize);
}
