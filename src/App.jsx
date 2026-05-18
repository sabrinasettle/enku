import { useState, useEffect, useRef } from 'react'
import GridView from './components/GridView'
import OutfitsView from './components/OutfitsView'
import DetailsPanel from './components/DetailsPanel'
import { loadImage } from './utils/imageStore'
import { generateOutfits } from './utils/combinations'
import { downloadGridPng, downloadOutfitsPdf } from './utils/download'

const EMPTY_SLOTS = () => [null, null, null]
const STORAGE_KEY = 'packing333-slots'

const initialCategories = [
  { id: 'tops', slots: EMPTY_SLOTS() },
  { id: 'bottoms', slots: EMPTY_SLOTS() },
  { id: 'shoes', slots: EMPTY_SLOTS() },
]

export default function App() {
  const [categories, setCategories] = useState(initialCategories)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('grid')
  const [showDetails, setShowDetails] = useState(false)
  const gridRef = useRef(null)

  useEffect(() => {
    async function restore() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const layout = JSON.parse(raw)
        const restored = await Promise.all(
          initialCategories.map(async (cat) => {
            const saved = layout[cat.id]
            if (!saved) return cat
            const slots = await Promise.all(
              saved.map(async (meta) => {
                if (!meta) return null
                try {
                  const blob = await loadImage(meta.id)
                  if (!blob) return null
                  return { ...meta, url: URL.createObjectURL(blob) }
                } catch {
                  return null
                }
              }),
            )
            return { ...cat, slots }
          }),
        )
        setCategories(restored)
      } catch {
        // corrupt storage — start fresh
      } finally {
        setLoaded(true)
      }
    }
    restore()
  }, [])

  useEffect(() => {
    if (!loaded) return
    const layout = {}
    categories.forEach((cat) => {
      layout[cat.id] = cat.slots.map((item) =>
        item ? { id: item.id, name: item.name } : null,
      )
    })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch {}
  }, [categories, loaded])

  function updateSlots(catId, updater) {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c
        const slots = typeof updater === 'function' ? updater(c.slots) : updater
        return { ...c, slots }
      }),
    )
  }

  function moveAcrossCategories(fromCatId, fromSlotIdx, toCatId, toSlotIdx) {
    setCategories((prev) => {
      const fromSlots = prev.find((c) => c.id === fromCatId)?.slots ?? EMPTY_SLOTS()
      const toSlots = prev.find((c) => c.id === toCatId)?.slots ?? EMPTY_SLOTS()
      const fromItem = fromSlots[fromSlotIdx]
      const toItem = toSlots[toSlotIdx]
      return prev.map((c) => {
        if (c.id === fromCatId && c.id === toCatId) {
          const next = [...c.slots]
          ;[next[fromSlotIdx], next[toSlotIdx]] = [toItem, fromItem]
          return { ...c, slots: next }
        }
        if (c.id === fromCatId) {
          const next = [...c.slots]
          next[fromSlotIdx] = toItem
          return { ...c, slots: next }
        }
        if (c.id === toCatId) {
          const next = [...c.slots]
          next[toSlotIdx] = fromItem
          return { ...c, slots: next }
        }
        return c
      })
    })
  }

  function renameItem(catId, slotIdx, newName) {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat
        const slots = [...cat.slots]
        if (slots[slotIdx]) slots[slotIdx] = { ...slots[slotIdx], name: newName }
        return { ...cat, slots }
      }),
    )
  }

  const outfits = generateOutfits(categories)

  async function handleDownloadGrid() {
    if (!gridRef.current) return
    try {
      await downloadGridPng(gridRef.current)
    } catch (err) {
      console.error('Grid export failed', err)
    }
  }

  function handleDownloadOutfits() {
    downloadOutfitsPdf(outfits)
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left sidebar — hidden on small screens */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 px-10 py-12 flex-col sticky top-0 h-screen">
        <div>
          <h1 className="text-sm font-bold text-black leading-snug">Sudoku Packing</h1>
          <p className="text-sm text-gray-400 mt-4 leading-relaxed">
            This is some text about this page and how the product helps with sudoku packing and
            helps people plan for trips
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-auto pt-12">
          <button
            onClick={handleDownloadGrid}
            className="text-sm underline text-black text-left hover:text-gray-500 transition-colors"
          >
            Download Grid
          </button>
          <button
            onClick={handleDownloadOutfits}
            className="text-sm underline text-black text-left hover:text-gray-500 transition-colors"
          >
            Download Outfits
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-6 py-8 lg:px-10 lg:py-12 flex flex-col">
        {/* Mobile header — only visible when sidebar is hidden */}
        <div className="flex items-center justify-between mb-8 lg:hidden">
          <h1 className="text-sm font-bold text-black">Sudoku Packing</h1>
          <div className="flex gap-4">
            <button onClick={handleDownloadGrid} className="text-xs underline text-black">
              Grid
            </button>
            <button onClick={handleDownloadOutfits} className="text-xs underline text-black">
              Outfits
            </button>
          </div>
        </div>

        {/* Tab row — aligned to grid width */}
        <div className="flex items-center gap-6 mb-14 max-w-2xl mx-auto w-full">
          <button
            onClick={() => setActiveTab('grid')}
            className={`text-sm transition-colors ${
              activeTab === 'grid' ? 'font-bold text-black' : 'font-normal text-gray-400 hover:text-gray-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setActiveTab('outfits')}
            className={`text-sm transition-colors ${
              activeTab === 'outfits' ? 'font-bold text-black' : 'font-normal text-gray-400 hover:text-gray-600'
            }`}
          >
            Outfits
          </button>
        </div>

        {activeTab === 'grid' && (
          <GridView
            categories={categories}
            onSlotsChange={updateSlots}
            onCrossMove={moveAcrossCategories}
            gridRef={gridRef}
          />
        )}

        {activeTab === 'outfits' && (
          <div className="max-w-2xl mx-auto w-full">
            <OutfitsView outfits={outfits} />
          </div>
        )}
      </main>

      {/* Right details panel — hidden on small screens, only on grid tab */}
      {activeTab === 'grid' && (
        <aside className="hidden lg:block w-52 flex-shrink-0 px-10 py-12">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            See Details
          </button>
          {showDetails && (
            <DetailsPanel categories={categories} onRename={renameItem} />
          )}
        </aside>
      )}
    </div>
  )
}
