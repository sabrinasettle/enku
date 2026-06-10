import { useState, useEffect, useRef } from "react";
import GridView from "./components/GridView";
import OutfitsView from "./components/OutfitsView";
import DetailsPanel from "./components/DetailsPanel";
import Icon from "./components/Icon";
import { loadImage } from "./utils/imageStore";
import { generateOutfitPatterns, generateOutfits } from "./utils/combinations";
import { downloadGridPng, downloadOutfitsPdf } from "./utils/download";

const EMPTY_SLOTS = () => [null, null, null];
const STORAGE_KEY = "packing333-slots";

const initialCategories = [
  { id: "col0", slots: EMPTY_SLOTS() },
  { id: "col1", slots: EMPTY_SLOTS() },
  { id: "col2", slots: EMPTY_SLOTS() },
];

function getPageFromLocation() {
  return window.location.pathname.replace(/\/+$/, "") === "/outfits"
    ? "outfits"
    : "grid";
}

export default function App() {
  const [categories, setCategories] = useState(initialCategories);
  const [loaded, setLoaded] = useState(false);
  const [activePage, setActivePage] = useState(getPageFromLocation);
  const [showMobileItems, setShowMobileItems] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    function handlePopState() {
      const nextPage = getPageFromLocation();
      setActivePage(nextPage);
      if (nextPage !== "outfits") {
        setShowMobileItems(false);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  useEffect(() => {
    if (!loaded) return;
    const layout = {};
    categories.forEach((cat) => {
      layout[cat.id] = cat.slots.map((item) =>
        item
          ? { id: item.id, name: item.name, rotation: item.rotation ?? 0 }
          : null,
      );
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [categories, loaded]);

  function updateSlots(catId, updater) {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
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

  function renameItem(catId, slotIdx, newName) {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const slots = [...cat.slots];
        if (slots[slotIdx])
          slots[slotIdx] = { ...slots[slotIdx], name: newName };
        return { ...cat, slots };
      }),
    );
  }

  const outfitPatterns = generateOutfitPatterns(categories);
  const outfits = generateOutfits(categories);
  const hasItems = categories.some((cat) => cat.slots.some(Boolean));

  async function handleDownloadGrid() {
    if (!gridRef.current) return;
    try {
      await downloadGridPng(gridRef.current);
    } catch (err) {
      console.error("Grid export failed", err);
    }
  }

  function handleDownloadOutfits() {
    downloadOutfitsPdf(outfits);
  }

  function navigateToPage(page, event) {
    event.preventDefault();
    const path = page === "outfits" ? "/outfits" : "/";

    if (activePage !== page) {
      window.history.pushState({}, "", path);
      setActivePage(page);
      if (page !== "outfits") {
        setShowMobileItems(false);
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left sidebar — hidden on small screens */}
      <aside className="hidden lg:flex w-72 shrink-0 px-10 py-12 flex-col sticky top-0 h-screen">
        <div>
          <h1 className="text-sm font-bold text-black leading-snug mb-8">
            Enku - Sudoku Packing
          </h1>
          <p className="text-sm text-gray-600 leading-tight pb-8">
            Sudoku-style 3x3x3 packing helps you plan 27 different outfits. Add
            a layering piece, a top, and a bottom to get started.
          </p>

          {activePage === "grid" ? (
            <>
              <a
                href="/outfits"
                onClick={(event) => navigateToPage("outfits", event)}
                className="nav-underline zen-icon-button text-sm text-gray-900 hover:text-black transition-colors"
              >
                See All Outfits
              </a>
            </>
          ) : (
            <a
              href="/"
              onClick={(event) => navigateToPage("grid", event)}
              className="nav-underline zen-icon-button inline-flex items-center gap-2 text-sm text-gray-900 hover:text-black transition-colors"
            >
              <Icon name="back" className="h-3 w-5" />
              Back to Grid
            </a>
          )}
        </div>
        <div className="flex flex-col  gap-3 mt-auto pt-12">
          {activePage === "outfits" ? (
            <>
              <button
                onClick={handleDownloadOutfits}
                className="zen-button text-sm border border-black rounded px-3 py-1.5 text-black hover:bg-black hover:text-white transition-colors"
              >
                Download Outfits
              </button>
            </>
          ) : (
            <button
              onClick={handleDownloadGrid}
              className="zen-button text-sm border border-black rounded px-3 py-1.5 text-black hover:bg-black hover:text-white transition-colors"
            >
              Download Grid
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-6 py-8 lg:px-10 lg:py-12 flex flex-col">
        {/* Mobile header — only visible when sidebar is hidden */}
        <div className="mb-10 lg:hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-base font-bold text-black">
              Enku - Sudoku Packing
            </h1>
            <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
              {activePage === "grid" && (
                <>
                  <a
                    href="/outfits"
                    onClick={(event) => navigateToPage("outfits", event)}
                    className="nav-underline zen-icon-button text-base text-gray-400 hover:text-black transition-colors"
                  >
                    See All Outfits
                  </a>
                </>
              )}
              {activePage === "outfits" && (
                <a
                  href="/"
                  onClick={(event) => navigateToPage("grid", event)}
                  className="nav-underline zen-icon-button inline-flex items-center gap-2 text-base text-gray-400 hover:text-black transition-colors"
                >
                  <Icon name="back" className="h-3 w-5" />
                  Grid
                </a>
              )}
            </div>
          </div>
          <p className="text-base text-gray-400 leading-relaxed">
            Sudoku-style 3x3x3 packing helps you plan 27 different outfits. Add
            a layering piece, a top, and a bottom to get started.
          </p>
        </div>

        <div key={activePage} className="view-panel">
          {activePage === "grid" && (
            <GridView
              categories={categories}
              onCategoriesChange={setCategories}
              onSlotsChange={updateSlots}
              onCrossMove={moveAcrossCategories}
              gridRef={gridRef}
            />
          )}

          {activePage === "outfits" && (
            <div className="max-w-2xl mx-auto w-full">
              <OutfitsView outfits={outfitPatterns} />
            </div>
          )}
        </div>

        <div className="mt-auto pt-12 pb-24 text-center text-xs leading-snug text-gray-400 lg:pb-2">
          <p>
            Items and images stay in this browser &#9865; No location or
            personal data is stored or tracked.
          </p>
        </div>
      </main>

      {/* Right panel — always rendered to keep layout stable */}
      <aside className="hidden lg:block w-80 shrink-0 px-10 py-12 sticky top-0 h-screen self-start">
        {activePage === "outfits" && (
          <DetailsPanel categories={categories} onRename={renameItem} />
        )}
      </aside>

      <p className="fixed bottom-14 right-10 z-30 hidden text-right text-xs leading-snug text-gray-400 lg:block">
        Made by Setsa Studio
      </p>

      {activePage === "grid" && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 lg:hidden">
          <p className="text-right text-xs leading-none text-gray-400">
            Made by Setsa Studio
          </p>
          <button
            type="button"
            onClick={handleDownloadGrid}
            className="zen-button rounded-full bg-black px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            Download Grid
          </button>
        </div>
      )}

      {activePage === "outfits" && hasItems && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 lg:hidden">
          <p className="text-right text-xs leading-none text-gray-400">
            Made by Setsa Studio
          </p>
          <button
            type="button"
            onClick={handleDownloadOutfits}
            className="zen-button rounded-full border border-black bg-white px-5 py-3 text-base font-bold text-black shadow-lg transition-colors hover:bg-black hover:text-white active:scale-[0.98]"
          >
            Download Outfits
          </button>
          <button
            type="button"
            onClick={() => setShowMobileItems(true)}
            className="zen-button rounded-full bg-black px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            Edit Items
          </button>
        </div>
      )}

      {showMobileItems && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-white overflow-y-auto px-6 py-7"
          role="dialog"
          aria-modal="true"
          aria-label="All items"
        >
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-lg font-bold leading-none text-black">
              All Items
            </h2>
            <button
              type="button"
              onClick={() => setShowMobileItems(false)}
              className="zen-icon-button relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-gray-400 hover:bg-gray-50"
              aria-label="Close all items"
            >
              <Icon name="add" className="h-4 w-4 rotate-45" />
            </button>
          </div>
          <DetailsPanel
            categories={categories}
            onRename={renameItem}
            variant="fullscreen"
            showTitle={false}
          />
        </div>
      )}
    </div>
  );
}
