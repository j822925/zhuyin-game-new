// Card illustrations stay in the gallery. Profiles use the transparent home art.
const roles = [
  ['lesson-01-pai', '拍', '拍光節奏使', 'music'],
  ['lesson-02-fen', '分', '分果小使者', 'honey'],
  ['lesson-03-hai', '海', '碧海領航使', 'bubble'],
  ['lesson-04-wa', '蛙', '翠潭蛙騎士', 'leaf'],
  ['lesson-05-wang', '王', '晨冠小王子', 'sun'],
  ['lesson-06-hua', '花', '百花織夢使', 'petal'],
];

export const HANZI_ENVOYS = roles.map(([id, symbol, name, fx]) => {
  const base = 'assets/hanzi-envoys-v1/' + id;
  return {
    id, symbol, name, fx, category: 'envoy', emoji: '✨',
    image: base + '/home.webp',
    battleImage: base + '/battle.webp',
    cardImage: 'assets/characters/expansion-20261123/' + id + '.webp',
  };
});
