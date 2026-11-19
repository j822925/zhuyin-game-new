// Score thresholds apply only to fixed five- and ten-question rounds.
export function roundVictory(correct, total) {
  if (!Number.isInteger(correct) || correct < 0 || correct > total) return null;
  if (total === 5) return correct >= 3;
  if (total === 10) return correct >= 7;
  return null;
}

export function showRoundOutcome(host, correct, total, key, hero = 'rabbit', enemy = 'twilight-count') {
  const won = roundVictory(correct, total);
  const previous = host.querySelector('.round-outcome');
  const identity = JSON.stringify([key, correct, total, hero, enemy]);
  if (previous?.dataset.round === identity) return;
  previous?.remove();
  if (won === null) return;
  const scene = document.createElement('figure');
  scene.className = 'round-outcome';
  scene.dataset.round = identity;
  scene.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;margin:.5em auto;text-align:center';
  const caption = document.createElement('figcaption');
  caption.style.cssText = 'width:100%;font-weight:bold';
  caption.textContent = won ? '我方獲勝！' : '敵方獲勝，再試一次！';
  scene.append(caption);
  host.prepend(scene);
  // Load the rigs after the score is visible. A missing image never blocks saving.
  Promise.all([import('./battle-sprite.js?v=20261011-battle1'), import('./data/battle-catalog.js?v=20261004-villains1')])
    .then(([{BattleSprite}, {battleCharacter}]) => {
      if (!scene.isConnected) return;
      for (const [side, id, wins] of [['enemy', enemy, !won], ['hero', hero, won]]) {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;width:min(34vw,145px);height:auto;aspect-ratio:1';
        canvas.setAttribute('aria-label', (side === 'hero' ? '我方' : '敵方') + (wins ? '獲勝' : '落敗'));
        scene.append(canvas);
        const rig = new BattleSprite(canvas, {side});
        rig.character(battleCharacter(id) || (side === 'hero' ? 'rabbit' : 'twilight-count'))
          .then(() => {
            if (!scene.isConnected) { rig.dispose(); return; }
            rig.play(wins ? 'victory' : 'defeated');
            rig.draw(0, 0);
            if (!wins && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
              const lean = side === 'hero' ? 9 : -9;
              canvas.animate([{transform:'none'}, {transform:'translateY(7%) rotate('+lean+'deg)'}],
                {duration:700, easing:'ease-out', fill:'forwards'});
            }
          }).catch(() => { rig.dispose(); canvas.remove(); });
      }
    }).catch(() => {});
}
