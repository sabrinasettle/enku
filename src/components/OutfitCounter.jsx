export default function OutfitCounter({ categories }) {
  const counts = categories.map((c) => c.slots.filter(Boolean).length)
  const hasAny = counts.some((n) => n > 0)
  const total = hasAny ? counts.reduce((acc, n) => acc * (n || 1), 1) : 0

  return (
    <div className="text-center py-4">
      <span className="text-5xl font-bold tabular-nums text-gray-900">{total}</span>
      <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest">unique outfits</p>
    </div>
  )
}
