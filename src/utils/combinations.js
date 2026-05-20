export function generateOutfits(categories) {
  return generateOutfitPatterns(categories).filter(
    ({ isComplete }) => isComplete,
  );
}

export function generateOutfitPatterns(categories) {
  const rowPatterns = getRowCombinations(categories);

  return rowPatterns.map((rows, idx) => {
    const items = rows.map((row, col) => ({
      item: categories[col]?.slots[row] ?? null,
      col: col + 1,
      row: row + 1,
    }));
    const filledCount = items.filter(({ item }) => item !== null).length;

    return {
      label: `Outfit ${idx + 1}`,
      items,
      filledCount,
      isComplete: filledCount === items.length,
    };
  });
}

function getRowCombinations(categories) {
  return categories.reduce(
    (patterns, category) =>
      patterns.flatMap((pattern) =>
        category.slots.map((_, row) => [...pattern, row]),
      ),
    [[]],
  );
}
