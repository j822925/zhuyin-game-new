import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let esbuild;
for (const candidate of ['esbuild', path.resolve(root, '../../zhuyin-game/.local/cloudflare-tools/node_modules/esbuild')]) {
  try { esbuild = require(candidate); break; } catch { /* Use an existing project dependency. */ }
}
if (!esbuild) throw Error('esbuild is required. Install it in the checkout or use the existing cloudflare-tools dependency.');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const safeJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const mime = file => ({ '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain' })[path.extname(file)] || 'application/octet-stream';
const asset = file => `data:${mime(file)};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
const bank = JSON.parse(read('data/hanzi-curriculum.json'));
const references = Object.fromEntries(bank.items.map(item => {
  const name = `data/hanzi-strokes/U${item.character.codePointAt(0).toString(16).toUpperCase()}.json`;
  return [name, read(name)];
}));
const resources = { 'data/hanzi-curriculum.json': JSON.stringify(bank), ...references };
if (Object.keys(references).length !== 84) throw Error('The offline preview must contain all 84 writing references.');

const { CHARACTER_CATALOG } = await import(pathToFileURL(path.join(root, 'data/character-catalog.js')));
const { MONSTERS } = await import(pathToFileURL(path.join(root, 'data/monsters.js')));
const hero = { ...CHARACTER_CATALOG[0], image: asset('assets/performance-v1/269d92a095f3e923.webp') };
const monster = { ...MONSTERS[0], image: asset('assets/mobile-thumbs-v1/c59c7c30324c36b8c75d.webp') };

// Only preview adapters differ. The application, grading, handwriting board,
// persistence, question bank and battle controller all come from current source.
// The adapters deliberately cannot authenticate or make network requests.
const replacements = new Map([
  ['class-context.js', `export const currentClass='main'; export const classStorageKey=key=>'hanzi.offline.'+key; export const classUrl=()=>location.href.split('#')[0]+'#entry';`],
  ['student-profile.js', `export const PROFILE_CHARACTERS=${safeJSON([hero])};`],
  ['data/monsters.js', `export const MONSTERS=${safeJSON([monster])};`],
  ['data/portrait-thumbnails.js', `export const optimizedImage=source=>source;`],
  ['data/battle-catalog.js', `export const BATTLE_META={};`],
  ['data/monster-collection-rules.js', `export const monsterRequirements=()=>[]; export const monsterLevelLabel=()=>'';`],
  ['monster-motion.js', `export function mountMonster(el){el.dataset.rigStatus='offline';} export function playMonster(el,action){el.dataset.previewMotion=action;}`],
  ['character-motion.js', `
    const timers=new WeakMap();
    export function mountCharacter(root,c){
      root.replaceChildren();const actor=document.createElement('span');actor.className='character-motion offline-actor';actor.dataset.motion='idle';actor.dataset.rig='rabbit';actor.dataset.name=c.name;
      actor.setAttribute('role','img');actor.setAttribute('aria-label',c.name);const body=document.createElement('span');body.className='motion-body';const img=document.createElement('img');img.src=c.image;img.alt='';body.append(img);actor.append(body);root.append(actor);return {play:state=>reactCharacter(root,state)};
    }
    export function reactCharacter(root,state){const actor=root?.querySelector('.character-motion');if(!actor)return;clearTimeout(timers.get(actor));actor.dataset.motion='idle';void actor.offsetWidth;actor.dataset.motion=state;if(state!=='idle')timers.set(actor,setTimeout(()=>{actor.dataset.motion='idle';},1800));}
  `],
  ['battle-effects.js', `
    export function startBattleEffects({actor,opponent,correct,timing}){
      const spark=document.createElement('span');spark.textContent='✦';spark.setAttribute('aria-hidden','true');spark.style.cssText='position:fixed;z-index:50;pointer-events:none;font-size:38px;color:#e8a53e;text-shadow:0 0 16px #fff6b4;';
      const a=actor.getBoundingClientRect(),b=opponent.getBoundingClientRect(),from=correct?a:b,to=correct?b:a;
      spark.style.left=(from.left+from.width/2)+'px';spark.style.top=(from.top+from.height/2)+'px';document.body.append(spark);
      const animation=spark.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:'translate('+ (to.left+to.width/2-from.left-from.width/2)+'px,'+(to.top+to.height/2-from.top-from.height/2)+'px) scale(.7)',opacity:0}],{duration:timing.impact+250,easing:'ease-in'});
      animation.finished.then(()=>spark.remove()).catch(()=>{});return {dispose(){animation.cancel();spark.remove();}};
    }
  `]
]);
const main = read('hanzi.js');
if (main.split("demo=params.get('demo')==='1'").length !== 2) throw Error('Preview guard could not locate the demo flag; refusing to build.');
const entry = main.replace("demo=params.get('demo')==='1'", 'demo=true')
  .replace("fixture=local&&params.get('fixture')==='1'", 'fixture=false');
const bundle = await esbuild.build({
  stdin: { contents: entry, resolveDir: root, sourcefile: 'hanzi-offline-entry.js', loader: 'js' },
  bundle: true, write: false, format: 'iife', target: ['chrome100','safari15.4'], minify: true,
  define: { 'import.meta.url': JSON.stringify('https://hanzi-offline.invalid/hanzi.js') },
  plugins: [{ name: 'offline-adapters', setup(build) {
    build.onResolve({filter: /^\.\.?\//}, args => ({ path: path.resolve(args.resolveDir, args.path.split('?')[0]) }));
    build.onLoad({filter: /\.js$/}, args => {
      const name = path.relative(root, args.path).split(path.sep).join('/');
      return replacements.has(name) ? { contents: replacements.get(name), loader: 'js', resolveDir: path.dirname(args.path) } : null;
    });
  }}]
});

function stylesheet(file, seen = new Set()) {
  if (seen.has(file)) return ''; seen.add(file);
  let css = read(file).replace(/@import\s+url\(['"]?([^'"\)]+)['"]?\);?/g, (_, imported) => stylesheet(path.posix.join(path.posix.dirname(file), imported.split('?')[0]), seen));
  return css.replace(/url\(['"]?([^'"\)]+)['"]?\)/g, (match, source) => {
    if (source.startsWith('data:')) return match;
    if (/^(https?:)?\/\//.test(source)) throw Error('External CSS resource is not permitted: '+source);
    return `url("${asset(path.posix.join(path.posix.dirname(file), source.split('?')[0]))}")`;
  });
}
let html = read('hanzi.html');
html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g, (_, file) => `<style>${stylesheet(file.split('?')[0])}</style>`);
html = html.replace(/src="(assets\/[^"?]+)(?:\?[^\"]*)?"/g, (_, file) => `src="${asset(file)}"`);
html = html.replace('教師試玩 · 成績與獎勵不會進入正式帳號', '老師離線試玩 · 試玩紀錄只保留在這個分頁');
html = html.replace(/<a id="teacher-link"[^>]*>[\s\S]*?<\/a>/, '<a id="teacher-link" href="#offline-note" class="teacher-link">關於這份試玩</a>');
const licenseText = ['licenses/hanzi-SOURCES.md','licenses/hanzi-AnimCJK-COPYING.txt','licenses/hanzi-ARPHICPL.txt'].map(read).join('\n\n========================================\n\n');
const license = 'data:text/plain;charset=utf-8;base64,' + Buffer.from(licenseText, 'utf8').toString('base64');
html = html.replace('href="licenses/hanzi-AnimCJK-COPYING.txt"', `href="${license}" download="hanzi-stroke-licenses.txt"`);
const extraStyle = `<style>.offline-actor{display:inline-block;width:100%;height:100%}.offline-actor .motion-body{display:block;width:100%;height:100%}.offline-actor img{width:100%;height:100%;object-fit:contain}.offline-actor[data-motion="attack"] .motion-body{animation:offline-strike .7s ease}.offline-actor[data-motion="defeat"] .motion-body{animation:offline-hurt .6s ease}.offline-actor[data-motion="victory"] .motion-body{animation:offline-cheer .8s ease}.practice-opponent[data-preview-motion="attack"] .monster-sprite{animation:offline-strike .7s ease reverse}.practice-opponent[data-preview-motion="hurt"] .monster-sprite{animation:offline-hurt .6s ease}@keyframes offline-strike{50%{transform:translateX(22px) rotate(9deg)}}@keyframes offline-hurt{25%,75%{transform:translateX(-10px) rotate(-5deg)}50%{transform:translateX(8px)}}@keyframes offline-cheer{40%{transform:translateY(-18px) rotate(-5deg)}75%{transform:translateY(-7px) rotate(4deg)}}@media(prefers-reduced-motion:reduce){.offline-actor .motion-body,.practice-opponent .monster-sprite{animation:none!important}}</style>`;
const safety = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src data:; form-action 'none'; base-uri 'none'">`;
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">'+safety);
const fallbackStyle = '<style>.practice-opponent[data-rig-status="offline"] .monster-sprite{visibility:visible!important}.practice-opponent[data-preview-motion="attack"] .monster-sprite{animation:offline-strike .7s ease reverse!important}.practice-opponent[data-preview-motion="hurt"] .monster-sprite{animation:offline-hurt .6s ease!important}@media(prefers-reduced-motion:reduce){.practice-opponent[data-rig-status="offline"] .monster-sprite{animation:none!important}}</style>';
html = html.replace('</head>', extraStyle+fallbackStyle+'</head>');
const preload = `
  const embeddedResources=${safeJSON(resources)};
  globalThis.fetch=async input=>{const value=String(input?.url||input),url=new URL(value,'https://hanzi-offline.invalid/');const marker=url.pathname.lastIndexOf('/data/');const key=marker>=0?url.pathname.slice(marker+1):url.pathname.replace(/^\\//,'');if(Object.hasOwn(embeddedResources,key))return new Response(embeddedResources[key],{status:200,headers:{'Content-Type':'application/json'}});throw Error('offline_network_disabled');};
  document.addEventListener('click',event=>{const link=event.target.closest?.('a');if(!link||link.hasAttribute('download'))return;event.preventDefault();if(link.id==='home-link'){document.getElementById('back-entry').click();}else if(link.id==='teacher-link'){document.getElementById('error').textContent='這份離線試玩可選課、認讀、手寫與重練錯題；作業、小考與卡片會在正式班級使用。';}});
`;
const script = `${preload}\n${bundle.outputFiles[0].text}`.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<script type="module" src="hanzi\.js[^\"]*"><\/script>/, `<script>${script}</script>`);
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"|<img[^>]+src="(?!data:)/.test(html)) throw Error('Unembedded resource remains in the preview.');
const digest = createHash('sha256').update(main).update(read('hanzi-client.js')).update(read('hanzi-stroke-core.js')).digest('hex').slice(0,16);
html = html.replace('<!doctype html>', `<!doctype html>\n<!-- Generated by tools/build-hanzi-preview.mjs; source ${digest}; 84 embedded stroke references. -->`);
const destination = path.join(root, 'teacher-preview/hanzi-offline.html');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, html, 'utf8');
console.log(JSON.stringify({ output: path.relative(root, destination), bytes: Buffer.byteLength(html), characters: bank.items.length, references: Object.keys(references).length, source: digest }));
