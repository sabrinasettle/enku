export function generateOutfits(categories) {
  const [c1, c2, c3] = categories;
  const outfits = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        outfits.push([
          { item: c1.slots[i], col: 1, row: i + 1 },
          { item: c2.slots[j], col: 2, row: j + 1 },
          { item: c3.slots[k], col: 3, row: k + 1 },
        ]);
      }
    }
  }
  return outfits;
}
