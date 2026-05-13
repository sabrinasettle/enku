export default function ItemCard({ item, onRemove, dragPayload, onSwap }) {
  function setOver(el, on) {
    el.dataset.dragOver = on ? 'true' : 'false'
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', dragPayload)
      }}
      onDragOver={(e) => { e.preventDefault(); setOver(e.currentTarget, true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(e.currentTarget, false) }}
      onDrop={(e) => { e.preventDefault(); setOver(e.currentTarget, false); onSwap(e) }}
      className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square cursor-grab active:cursor-grabbing transition-all"
    >
      <img
        src={item.url}
        alt={item.name}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none"
      />
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs
                   opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
                   flex items-center justify-center leading-none cursor-pointer"
        aria-label="Remove item"
      >
        ×
      </button>
    </div>
  )
}
