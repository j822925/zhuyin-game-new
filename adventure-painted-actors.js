// Every sheet has four columns and two rows with a shared ground line.
export const FIELD_CREATURES = ['sprout','pebble','crab','cloud','snail','calf'];
const sheets = new Map();

function sheetFor(id) {
  const cached = sheets.get(id);
  if (cached) return cached;
  const image = new Image();
  image.src = 'assets/island-painted-v1/' + id + '.webp';
  sheets.set(id, image);
  image.onerror = () => setTimeout(() => {
    if (sheets.get(id) === image) sheets.delete(id);
  }, 30000);
  return image;
}

export function drawPaintedFrame(ctx, id, frame, x, y, height, faceRight = false) {
  const image = sheetFor(id);
  if (!image.complete || !image.naturalWidth) return false;
  const sw = image.naturalWidth / 4, sh = image.naturalHeight / 2;
  const width = height * sw / sh;
  ctx.save();
  ctx.translate(x, y);
  if (faceRight) ctx.scale(-1, 1);
  ctx.drawImage(image, frame % 4 * sw, Math.floor(frame / 4) * sh, sw, sh,
    -width / 2, -height, width, height);
  ctx.restore();
  return true;
}

export function fieldFigure(id, fallback, guardian = false) {
  const host = document.createElement('span');
  host.className = 'painted-figure' + (guardian ? ' painted-guardian' : '');
  const canvas = document.createElement('canvas');
  canvas.width = guardian ? 384 : 180;
  canvas.height = guardian ? 448 : 180;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.figure = id;
  host.append(fallback, canvas);
  return host;
}

export function paintFieldFigure(host, seconds, faceRight = false) {
  if (!host) return;
  const canvas = host.lastElementChild;
  const guardian = host.classList.contains('painted-guardian');
  const frame = Math.floor(seconds * (guardian ? 3.5 : 7)) % 8;
  const key = frame + '/' + faceRight;
  if (canvas.dataset.pose === key) return;
  const image = sheetFor(canvas.dataset.figure);
  if (!image.complete || !image.naturalWidth) return;
  if (guardian && canvas.width !== image.naturalWidth / 4) {
    canvas.width = image.naturalWidth / 4;
    host.style.aspectRatio = canvas.width + '/' + canvas.height;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (drawPaintedFrame(ctx, canvas.dataset.figure, frame, canvas.width / 2, canvas.height, canvas.height, faceRight)) {
    canvas.dataset.pose = key;
    host.classList.add('painted-ready');
  }
}
