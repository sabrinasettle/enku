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
  const mainHeadingRef = useRef(null);
  const mobileItemsCloseRef = useRef(null);
  const mobileItemsTriggerRef = useRef(null);
  const mobileItemsDialogRef = useRef(null);

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

  useEffect(() => {
    mainHeadingRef.current?.focus();
  }, [activePage]);

  useEffect(() => {
    if (!showMobileItems) return undefined;

    const previousActiveElement = document.activeElement;
    const fallbackTrigger = mobileItemsTriggerRef.current;
    mobileItemsCloseRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowMobileItems(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = mobileItemsDialogRef.current?.querySelectorAll(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const elements = Array.from(focusable ?? []).filter(
        (element) =>
          element instanceof HTMLElement &&
          !element.hasAttribute("disabled") &&
          !element.getAttribute("aria-hidden"),
      );
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      } else if (fallbackTrigger) {
        fallbackTrigger.focus();
      }
    };
  }, [showMobileItems]);

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-black focus:ring-2 focus:ring-black"
      >
        Skip to main content
      </a>
      {/* Left sidebar — hidden on small screens */}
      <aside
        className="hidden lg:flex w-72 shrink-0 px-10 py-12 flex-col sticky top-0 h-screen"
        aria-label="App navigation"
      >
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
      </aside>

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 min-w-0 px-6 py-8 lg:px-10 lg:py-12 flex flex-col"
      >
        <h2 ref={mainHeadingRef} tabIndex={-1} className="sr-only">
          {activePage === "outfits" ? "All outfits" : "Packing grid"}
        </h2>
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

        <div key={activePage} className="view-panel" aria-live="polite">
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

        <div className="mt-auto pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))] text-center text-xs leading-snug text-gray-400 lg:pb-2">
          <p>
            Items and images stay in this browser &#9865; No location or
            personal data is stored or tracked.
          </p>
        </div>
      </main>

      {/* Right panel — always rendered to keep layout stable */}
      <aside
        className="hidden lg:block w-80 shrink-0 px-10 py-12 sticky top-0 h-screen self-start"
        aria-label="Item details"
      >
        {activePage === "outfits" && (
          <DetailsPanel categories={categories} onRename={renameItem} />
        )}
      </aside>

      <p className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 z-30 text-xs leading-none text-gray-400 lg:bottom-14 lg:left-10 lg:leading-snug">
        Made by Setsa Studio
      </p>

      {activePage === "grid" && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex flex-col items-end gap-3 lg:bottom-14 lg:right-10">
          <button
            type="button"
            onClick={handleDownloadGrid}
            className="zen-button rounded-full bg-black px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98] lg:rounded lg:border lg:border-black lg:bg-white lg:px-3 lg:py-1.5 lg:text-sm lg:text-black lg:shadow-none lg:hover:bg-black lg:hover:text-white"
          >
            Download Grid
          </button>
        </div>
      )}

      {activePage === "outfits" && hasItems && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex flex-col items-end gap-2 lg:bottom-14 lg:right-10">
          <button
            type="button"
            onClick={handleDownloadOutfits}
            className="zen-button rounded-full border border-black bg-white px-5 py-3 text-base font-bold text-black shadow-lg transition-colors hover:bg-black hover:text-white active:scale-[0.98] lg:rounded lg:px-3 lg:py-1.5 lg:text-sm lg:shadow-none"
          >
            Download Outfits
          </button>
          <button
            type="button"
            onClick={() => setShowMobileItems(true)}
            ref={mobileItemsTriggerRef}
            className="zen-button rounded-full bg-black px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98] lg:hidden"
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
          aria-labelledby="mobile-items-title"
          ref={mobileItemsDialogRef}
        >
          <div className="mb-10 flex items-center justify-between">
            <h2
              id="mobile-items-title"
              className="text-lg font-bold leading-none text-black"
            >
              All Items
            </h2>
            <button
              type="button"
              ref={mobileItemsCloseRef}
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
