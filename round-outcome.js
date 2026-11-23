// Score thresholds apply only to fixed five- and ten-question rounds.
export function roundVictory(correct, total) {
  if (!Number.isInteger(correct) || correct < 0 || correct > total) return null;
  if (total === 5) return correct >= 3;
  if (total === 10) return correct >= 7;
  return null;
}

function outcomeStyles() {
  if (document.getElementById('round-outcome-styles')) return;
  const style = document.createElement('style');
  style.id = 'round-outcome-styles';
  style.textContent = `
    .round-outcome{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;justify-content:center;align-items:start;margin:8px auto 16px;text-align:center}
    .round-outcome>figcaption{grid-column:1/-1;font-size:clamp(22px,2.5vw,30px);line-height:1.4;font-weight:800;color:#456849}
    .round-outcome[data-won=false]>figcaption{color:#856647}
    .round-outcome-actor{min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}
    .round-outcome-actor canvas{display:block;width:min(100%,260px);height:auto;aspect-ratio:1}
    .round-outcome-actor>span{font:800 15px/1.4 system-ui,sans-serif;color:#63745b}
    .round-outcome-replay{grid-column:1/-1;justify-self:center;min-height:44px;padding:7px 14px;border:1px solid #c6ceb4;border-radius:14px;background:#f2f5e8;color:#496447;font:700 15px/1.4 system-ui,sans-serif;cursor:pointer}
    .round-outcome-panel{position:relative;box-sizing:border-box;left:50%;transform:translateX(-50%);width:min(1100px,calc(100vw - 40px));max-width:none!important;margin-inline:0!important;min-height:430px;padding:28px clamp(200px,28vw,300px)!important}
    .round-outcome-panel .round-outcome{display:flex;flex-direction:column;align-items:center;gap:8px;margin:0 0 16px}
    .round-outcome-panel .round-outcome-actor{position:absolute;top:58px;width:clamp(180px,25vw,280px)}
    .round-outcome-panel .round-outcome-actor[data-side=enemy]{left:4px}
    .round-outcome-panel .round-outcome-actor[data-side=hero]{right:4px}
    .round-outcome-panel .round-outcome-actor canvas{width:100%;max-width:none}
    .round-outcome-panel .result-actions{flex-wrap:wrap;justify-content:center}
    .round-outcome-panel>.celebration{display:none}
    .round-outcome-panel>.eyebrow{margin:0 0 6px}
    .round-outcome-panel>h1{margin:0 0 14px;font-size:clamp(26px,3vw,34px)}
    .round-outcome-panel #result-details>h2{margin:12px 0;font-size:24px}
    .round-outcome-panel .metrics{margin:14px 0}
    @media(max-width:700px){
      .round-outcome-panel{left:auto;transform:none;width:100%;margin-inline:auto!important;min-height:0;padding:20px 14px!important}
      .round-outcome-panel .round-outcome{display:grid;gap:4px 8px;margin-bottom:14px}
      .round-outcome-panel .round-outcome-actor{position:static;width:100%}
      .round-outcome-panel .round-outcome-actor canvas{width:min(100%,240px)}
      .round-outcome-actor>span{font-size:13px}
    }
  `;
  document.head.append(style);
}

function resultPanel(host) {
  // Split-screen results each keep their own actors instead of overlapping a shared card.
  if (host.closest('.race-results') || host.closest('#result-details')?.querySelectorAll('h2').length > 1) return null;
  return host.closest('.result-card,.result-panel') || (host.id === 'result' ? host : null);
}

export function showRoundOutcome(host, correct, total, key, hero = 'rabbit', enemy = 'twilight-count') {
  const won = roundVictory(correct, total);
  const previous = host.querySelector('.round-outcome');
  const identity = JSON.stringify([key, correct, total, hero, enemy]);
  if (previous?.dataset.round === identity) return;
  previous?.remove();
  if (won === null) {
    const panel = resultPanel(host);
    if (panel && !panel.querySelector('.round-outcome')) panel.classList.remove('round-outcome-panel');
    return;
  }
  outcomeStyles();
  resultPanel(host)?.classList.add('round-outcome-panel');
  const scene = document.createElement('figure');
  scene.className = 'round-outcome';
  scene.dataset.round = identity;
  scene.dataset.won = String(won);
  const caption = document.createElement('figcaption');
  caption.textContent = won ? '我方獲勝！' : '敵方獲勝，再試一次！';
  scene.append(caption);
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'round-outcome-replay';
  replay.textContent = '↻ 再看一次';
  replay.setAttribute('aria-label', '重播雙方結算動作');
  replay.disabled = true;
  const actors = [];
  const play = actor => {
    actor.effect?.cancel();
    actor.rig.play(actor.wins ? 'victory' : 'defeated');
    actor.rig.draw(0, 0);
    if (!actor.wins && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const lean = actor.side === 'hero' ? 9 : -9;
      actor.effect = actor.canvas.animate([{transform:'none'}, {transform:'translateY(7%) rotate('+lean+'deg)'}],
        {duration:700, easing:'ease-out', fill:'forwards'});
    }
  };
  replay.onclick = () => actors.forEach(play);
  scene.append(replay);
  host.prepend(scene);
  // Load the rigs after the score is visible. A missing image never blocks saving.
  Promise.all([import('./battle-sprite.js?v=20261123-starenvoys1'), import('./data/battle-catalog.js?v=20261123-starenvoys1')])
    .then(([{BattleSprite}, {battleCharacter}]) => {
      if (!scene.isConnected) return;
      for (const [side, id, wins] of [['enemy', enemy, !won], ['hero', hero, won]]) {
        const actor = document.createElement('div');
        actor.className = 'round-outcome-actor';
        actor.dataset.side = side;
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-label', (side === 'hero' ? '我方' : '敵方') + (wins ? '獲勝' : '落敗'));
        const label = document.createElement('span');
        label.textContent = side === 'hero' ? '我方' : '敵方';
        actor.append(canvas, label);
        scene.insertBefore(actor, replay);
        const rig = new BattleSprite(canvas, {side});
        rig.character(battleCharacter(id) || (side === 'hero' ? 'rabbit' : 'twilight-count'))
          .then(() => {
            if (!scene.isConnected) { rig.dispose(); return; }
            const ready = {rig, canvas, wins, side};
            actors.push(ready);
            play(ready);
            replay.disabled = false;
          }).catch(() => { rig.dispose(); actor.remove(); });
      }
    }).catch(() => {});
}
