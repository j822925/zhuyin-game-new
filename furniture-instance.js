// The original piece keeps the product ID used by existing saves. Copies have
// distinct IDs so room positions and tabletop attachments survive a move.
export function furnitureProductId(id) {
  return typeof id === 'string' ? id.replace(/__(?:[2-9]|[1-9][0-9]+)$/, '') : undefined;
}
export function nextFurnitureId(owned, productId) {
  const used = new Set(owned);
  if (!used.has(productId)) return productId;
  let number = 2;
  while (used.has(productId + '__' + number)) number++;
  return productId + '__' + number;
}

export function lookupFurniture(catalog, id) {
  const productId = furnitureProductId(id);
  return catalog.find(item => item.id === productId);
}
