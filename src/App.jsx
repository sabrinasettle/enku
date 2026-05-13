import { useState, useEffect } from "react";
import CategorySlot from "./components/CategorySlot";
// import OutfitCounter from "./components/OutfitCounter";
import { loadImage, deleteImage } from "./utils/imageStore";

const EMPTY_SLOTS = () => [null, null, null];
const STORAGE_KEY = "packing333-slots";

const initialCategories = [
  { id: "tops", slots: EMPTY_SLOTS() },
  { id: "bottoms", slots: EMPTY_SLOTS() },
  { id: "slot3", slots: EMPTY_SLOTS() },
];

export default function App() {
  const [categories, setCategories] = useState(initialCategories);
  const [loaded, setLoaded] = useState(false);

  // Restore slots from localStorage + IndexedDB on mount
  useEffect(() => {
    async function restore() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const layout = JSON.parse(raw);

        const restored = await Promise.all(
          initialCategories.map(async (cat) => {
            const saved = layout[cat.id];
            if (!saved) return cat;
            const slots = await Promise.all(
              saved.map(async (meta) => {
                if (!meta) return null;
                try {
                  const blob = await loadImage(meta.id);
                  if (!blob) return null;
                  return { ...meta, url: URL.createObjectURL(blob) };
                } catch {
                  return null;
                }
              }),
            );
            return { ...cat, slots };
          }),
        );

        setCategories(restored);
      } catch {
        // corrupt storage — start fresh
      } finally {
        setLoaded(true);
      }
    }
    restore();
  }, []);

  // Persist slot layout (ids + names only) to localStorage on every change
  useEffect(() => {
    if (!loaded) return;
    const layout = {};
    categories.forEach((cat) => {
      layout[cat.id] = cat.slots.map((item) =>
        item ? { id: item.id, name: item.name } : null,
      );
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // storage full, skip
    }
  }, [categories, loaded]);

  function updateSlots(id, updater) {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const slots =
          typeof updater === "function" ? updater(c.slots) : updater;
        return { ...c, slots };
      }),
    );
  }

  function moveAcrossCategories(fromCatId, fromSlotIdx, toCatId, toSlotIdx) {
    setCategories((prev) => {
      const fromSlots =
        prev.find((c) => c.id === fromCatId)?.slots ?? EMPTY_SLOTS();
      const toSlots =
        prev.find((c) => c.id === toCatId)?.slots ?? EMPTY_SLOTS();
      const fromItem = fromSlots[fromSlotIdx];
      const toItem = toSlots[toSlotIdx];

      return prev.map((c) => {
        if (c.id === fromCatId && c.id === toCatId) {
          const next = [...c.slots];
          [next[fromSlotIdx], next[toSlotIdx]] = [toItem, fromItem];
          return { ...c, slots: next };
        }
        if (c.id === fromCatId) {
          const next = [...c.slots];
          next[fromSlotIdx] = toItem;
          return { ...c, slots: next };
        }
        if (c.id === toCatId) {
          const next = [...c.slots];
          next[toSlotIdx] = fromItem;
          return { ...c, slots: next };
        }
        return c;
      });
    });
  }

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            3×3×3 Packing
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">9 pieces · 27 outfits</p>
        </div>
      </header>

      {/* <OutfitCounter categories={categories} />*/}

      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <CategorySlot
            key={cat.id}
            categoryId={cat.id}
            slots={cat.slots}
            onSlotsChange={(updater) => updateSlots(cat.id, updater)}
            onCrossMove={moveAcrossCategories}
          />
        ))}
      </div>

      <footer className="text-center text-xs text-gray-300 mt-auto pt-4">
        background removal runs locally · images never leave your device
      </footer>
    </div>
  );
}
