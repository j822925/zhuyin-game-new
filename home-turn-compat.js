const rooms = ['layout', 'kitchenLayout', 'bedroomLayout', 'bathroomLayout'];

function samePlacement(before, after) {
  if (before.facing !== after.facing || before.mount !== after.mount || before.on !== after.on) return false;
  if (before.on) return before.surface === after.surface && before.offsetX === after.offsetX;
  return before.x === after.x && before.y === after.y;
}

// The earlier room editor rebuilds layout records without optional angles.
// Carry those angles across an ordinary save only while the piece stays put.
export function retainTurnsInStableBuild(student) {
  let previous = student.state;
  if (!rooms.some(key => previous?.[key]?.some(item => Number.isInteger(item.turn)))) return;
  const save = student.save.bind(student);
  student.save = next => {
    const merged = { ...next };
    for (const key of rooms) {
      if (!Array.isArray(next[key])) continue;
      const turned = new Map((previous[key] || []).filter(p => Number.isInteger(p.turn)).map(p => [p.id, p]));
      if (!turned.size) continue;
      merged[key] = next[key].map(item => {
        const saved = turned.get(item.id);
        return saved && samePlacement(saved, item) ? { ...item, turn: saved.turn } : item;
      });
    }
    const result = save(merged);
    if (result) previous = merged;
    return result;
  };
}
