export default function OutfitsView({ outfits }) {
  return (
    <div className="flex flex-col gap-10">
      {outfits.map((outfit, idx) => (
        <OutfitRow key={idx} outfit={outfit} number={idx + 1} />
      ))}
    </div>
  )
}

function OutfitRow({ outfit, number }) {
  return (
    <div className="flex items-start gap-16">
      <div className="min-w-0">
        <p className="font-bold text-sm mb-2">Outfit {number}</p>
        <div className="flex flex-col gap-0.5">
          {outfit.map(({ item, col, row }, i) => (
            <p key={i} className="text-sm text-gray-600">
              {item
                ? `${item.name} - Col ${col} Row ${row}`
                : `Item ${i + 1} - [Col ${col} Row ${row}]`}
            </p>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 mt-0.5">
        <GridInfographic outfit={outfit} />
      </div>
    </div>
  )
}

function GridInfographic({ outfit }) {
  const highlighted = new Set(
    outfit.map(({ col, row }) => `${col - 1}-${row - 1}`)
  )

  return (
    <div className="flex flex-col gap-1">
      {[0, 1, 2].map((rowIdx) => (
        <div key={rowIdx} className="flex gap-1">
          {[0, 1, 2].map((colIdx) => (
            <div
              key={colIdx}
              className={`w-4 h-4 rounded-sm ${
                highlighted.has(`${colIdx}-${rowIdx}`)
                  ? 'bg-gray-400'
                  : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
