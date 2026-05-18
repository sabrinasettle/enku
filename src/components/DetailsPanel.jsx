import { useState } from 'react'

export default function DetailsPanel({ categories, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const items = categories.flatMap((cat, colIdx) =>
    cat.slots
      .map((item, rowIdx) =>
        item ? { ...item, catId: cat.id, slotIdx: rowIdx, col: colIdx + 1, row: rowIdx + 1 } : null
      )
      .filter(Boolean)
  )

  function startEdit(item) {
    setEditingId(item.id)
    setEditValue(item.name)
  }

  function commitEdit(item) {
    const trimmed = editValue.trim()
    if (trimmed) onRename(item.catId, item.slotIdx, trimmed)
    setEditingId(null)
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-4 mt-6">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 group">
          <div className="w-9 h-9 flex-shrink-0 rounded bg-gray-100 overflow-hidden">
            <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
          </div>

          {editingId === item.id ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(item)
                if (e.key === 'Escape') setEditingId(null)
              }}
              className="text-sm flex-1 border-b border-gray-300 outline-none bg-transparent pb-0.5"
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm truncate">{item.name}</span>
              <button
                onClick={() => startEdit(item)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black transition-opacity flex-shrink-0 text-xs leading-none"
                aria-label="Rename item"
              >
                ✏
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
