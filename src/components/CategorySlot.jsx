import { useState, useRef } from 'react'
import ItemCard from './ItemCard'
import { useBackgroundRemoval, fileToDisplayBlob } from '../hooks/useBackgroundRemoval'
import { saveImage, deleteImage } from '../utils/imageStore'

export default function CategorySlot({ categoryId, slots, onSlotsChange, onCrossMove }) {
  const fileInputRef = useRef(null)
  const pendingSlotIdx = useRef(null)
  const { removeFromFile } = useBackgroundRemoval()
  const [processingSlot, setProcessingSlot] = useState(null)

  function handleEmptyClick(slotIdx) {
    if (processingSlot !== null) return
    pendingSlotIdx.current = slotIdx
    fileInputRef.current?.click()
  }

  async function handleFiles(e) {
    const file = e.target.files[0]
    const slotIdx = pendingSlotIdx.current
    if (!file || slotIdx === null) return

    setProcessingSlot(slotIdx)
    const id = crypto.randomUUID()

    let blob, url
    try {
      const result = await removeFromFile(file)
      blob = result.blob
      url = result.url
    } catch {
      blob = await fileToDisplayBlob(file)
      url = URL.createObjectURL(blob)
    }

    await saveImage(id, blob).catch(() => {})

    onSlotsChange((prev) => {
      const next = [...prev]
      next[slotIdx] = { id, name: file.name.replace(/\.[^.]+$/, ''), url }
      return next
    })

    e.target.value = ''
    pendingSlotIdx.current = null
    setProcessingSlot(null)
  }

  function handleRemove(slotIdx) {
    const item = slots[slotIdx]
    if (item) deleteImage(item.id).catch(() => {})
    onSlotsChange((prev) => {
      const next = [...prev]
      next[slotIdx] = null
      return next
    })
  }

  function parseDrop(e) {
    try {
      return JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return null
    }
  }

  function handleSwap(e, toSlotIdx) {
    const data = parseDrop(e)
    if (!data) return
    const { catId: fromCatId, fromSlotIdx } = data

    if (fromCatId === categoryId) {
      if (fromSlotIdx === toSlotIdx) return
      onSlotsChange((prev) => {
        const next = [...prev]
        ;[next[fromSlotIdx], next[toSlotIdx]] = [next[toSlotIdx], next[fromSlotIdx]]
        return next
      })
    } else {
      onCrossMove(fromCatId, fromSlotIdx, categoryId, toSlotIdx)
    }
  }

  function setOver(el, on) {
    el.dataset.dragOver = on ? 'true' : 'false'
  }

  return (
    <div>
      {slots.map((item, i) =>
        item ? (
          <div
            key={item.id}
            className={i < 2 ? 'border-b border-gray-300' : ''}
          >
            <div className="p-3 sm:p-4 lg:p-6">
              <ItemCard
                item={item}
                onRemove={() => handleRemove(i)}
                dragPayload={JSON.stringify({ catId: categoryId, fromSlotIdx: i })}
                onSwap={(e) => handleSwap(e, i)}
              />
            </div>
          </div>
        ) : (
          <div
            key={`empty-${i}`}
            className={i < 2 ? 'border-b border-gray-300' : ''}
          >
            <div className="p-3 sm:p-4 lg:p-6">
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleEmptyClick(i)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmptyClick(i)}
                onDragOver={(e) => { e.preventDefault(); setOver(e.currentTarget, true) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(e.currentTarget, false) }}
                onDrop={(e) => { e.preventDefault(); setOver(e.currentTarget, false); handleSwap(e, i) }}
                className="aspect-square rounded-2xl border border-dashed border-gray-200
                           flex items-center justify-center transition-colors select-none cursor-pointer
                           hover:border-gray-400"
              >
                <span className="pointer-events-none text-2xl leading-none text-gray-300">
                  {processingSlot === i ? '···' : '+'}
                </span>
              </div>
            </div>
          </div>
        )
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}
