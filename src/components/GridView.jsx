import CategorySlot from './CategorySlot'

export default function GridView({
  categories,
  onCategoriesChange,
  onSlotsChange,
  onCrossMove,
  gridRef,
}) {
  return (
    <div className="flex-1">
      <div ref={gridRef} className="flex max-w-2xl mx-auto w-full">
        {categories.map((cat, colIdx) => (
          <div
            key={cat.id}
            className={`flex-1 ${colIdx < categories.length - 1 ? 'border-r border-gray-300' : ''}`}
          >
            <CategorySlot
              categoryId={cat.id}
              categories={categories}
              slots={cat.slots}
              onSlotsChange={(updater) => onSlotsChange(cat.id, updater)}
              onCategoriesChange={onCategoriesChange}
              onCrossMove={onCrossMove}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
