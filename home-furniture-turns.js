import { turnPaintings } from './data/home-turn-art.js';
import { adventureMediaUrl } from './adventure-media.js';

const images = new Map();
const flatViews = new WeakMap();

function paintedView(furniture, turn) {
  const painting = turnPaintings[furniture.id];
  if (!painting) return null;
  const key = painting.asset || furniture.id;
  let image = images.get(key);
  if (!image) {
    image = new Image();
    image.src = adventureMediaUrl('assets/home-turns/' + key + '.webp');
    images.set(key, image);
    image.onerror = () => setTimeout(() => images.delete(key), 30000);
  }
  if (!image.complete || !image.naturalWidth) return null;
  const side = turn === 2 || turn === 6;
  const rear = turn === 3 || turn === 5;
  const row = side ? 3 : turn === 4 ? 2 : rear ? 1 : 0;
  const mirror = side ? turn === (painting.sideRight ? 6 : 2)
    : rear ? turn === (painting.rearLeft ? 3 : 5)
    : turn === (painting.frontRight ? 7 : 1);
  return { image, ...painting.cells[row], mirror, ratio: 1 };
}

// A rug rotates in the plane of the floor. Project both dimensions before
// applying the turn so its far edge keeps the same perspective as the room.
function flatView(atlas, cell, turn) {
  let cached = flatViews.get(cell);
  if (!cached) { cached = new Map(); flatViews.set(cell, cached); }
  if (cached.has(turn)) return cached.get(turn);
  const angle = turn * Math.PI / 4;
  const c = Math.cos(angle), s = Math.sin(angle), perspective = 0.4;
  const image = document.createElement('canvas');
  image.width = Math.ceil(cell.w * Math.abs(c) + cell.h * Math.abs(s) / perspective) + 2;
  image.height = Math.ceil(cell.w * Math.abs(s) * perspective + cell.h * Math.abs(c)) + 2;
  const ctx = image.getContext('2d');
  ctx.translate(image.width / 2, image.height / 2);
  ctx.transform(c, -s * perspective, s / perspective, c, 0, 0);
  ctx.drawImage(atlas.image, cell.x, cell.y, cell.w, cell.h, -cell.w / 2, -cell.h / 2, cell.w, cell.h);
  const view = { image, x: 0, y: 0, w: image.width, h: image.height, ratio: cell.h / image.height };
  cached.set(turn, view);
  return view;
}

export function turnedBounds(art, f, item) {
  const turn = item.turn;
  if (f.corner || !Number.isInteger(turn) || turn < 0 || turn > 7) return null;
  const atlas = art[f.atlas || 'furniture'];
  const cell = atlas?.cells[f.index];
  if (!cell) return null;
  const sprite = turn === 0 ? { image: atlas.image, ...cell, ratio: 1 }
    : f.flat || f.ceiling ? flatView(atlas, cell, turn) : paintedView(f, turn);
  if (!sprite) return null;
  const h = f.height / sprite.ratio, w = h * sprite.w / sprite.h;
  const top = f.flat || f.ceiling ? item.y - (f.height + h) / 2 : item.y - h;
  return { x: item.x - w / 2, y: top, w, h, sprite };
}

export function drawTurned(ctx, art, f, item) {
  const bounds = turnedBounds(art, f, item);
  if (!bounds) return false;
  const { x, y, w, h, sprite } = bounds;
  ctx.save();
  if (!f.flat && !f.wall && !item.on) {
    ctx.fillStyle = '#654d3224';
    ctx.beginPath();
    ctx.ellipse(item.x, item.y, Math.min(f.fw * 0.50, w * 0.44), f.fh * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(sprite.mirror ? x + w : x, y);
  if (sprite.mirror) ctx.scale(-1, 1);
  ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, w, h);
  ctx.restore();
  return true;
}
