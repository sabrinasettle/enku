export default function OutfitsView({ outfits }) {
  const hasAnyFilledItem = outfits.some(({ filledCount }) => filledCount > 0);

  if (!hasAnyFilledItem) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-400 text-sm">No outfits yet.</p>
        <p className="text-gray-300 text-sm mt-1">
          Add items to see outfit layouts fill in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {outfits.map(({ label, items }, idx) => (
        <OutfitRow key={idx} label={label} items={items} />
      ))}
    </div>
  );
}

function OutfitRow({ label, items }) {
  const filledCount = items.filter(({ item }) => item !== null).length;
  const isComplete = filledCount === items.length;

  return (
    <div className="flex items-start gap-16">
      <div className="shrink-0 mt-0.5">
        <GridInfographic items={items} />
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-3 mb-2">
          <p className="font-bold text-base lg:text-sm">{label}</p>
          <p className="text-xs text-gray-400">
            {isComplete ? "Complete" : `${filledCount}/${items.length} filled`}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          {items.map(({ item, col, row }, i) => (
            <p
              key={i}
              className={`text-base lg:text-sm ${
                item ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {item ? item.name : `Empty — Col ${col} Row ${row}`}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridInfographic({ items }) {
  const filled = new Set(
    items
      .filter(({ item }) => item !== null)
      .map(({ col, row }) => `${col - 1}-${row - 1}`),
  );
  const missing = new Set(
    items
      .filter(({ item }) => item === null)
      .map(({ col, row }) => `${col - 1}-${row - 1}`),
  );
  const pattern = new Set(
    items.map(({ col, row }) => `${col - 1}-${row - 1}`),
  );

  return (
    <div className="flex flex-col gap-1">
      {[0, 1, 2].map((rowIdx) => (
        <div key={rowIdx} className="flex gap-1">
          {[0, 1, 2].map((colIdx) => (
            <div
              key={colIdx}
              className={getCellClass(
                `${colIdx}-${rowIdx}`,
                filled,
                missing,
                pattern,
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function getCellClass(cellKey, filled, missing, pattern) {
  const base = "w-4 h-4 rounded-xs";

  if (filled.has(cellKey)) return `${base} bg-gray-500`;
  if (missing.has(cellKey)) return `${base} bg-white border border-gray-300`;
  if (pattern.has(cellKey)) return `${base} bg-gray-100`;

  return `${base} bg-gray-100`;
}
