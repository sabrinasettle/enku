import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

export default function ItemCard({
  item,
  onRemove,
  onRotate,
  onRename,
  dragPayload,
  onSwap,
  active,
  queued,
  queuePosition,
  onCancel,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftName, setDraftName] = useState(item.name);

  function setOver(el, on) {
    el.dataset.dragOver = on ? "true" : "false";
  }

  const isProcessing = active || queued;

  useEffect(() => {
    if (!editorOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      setEditorOpen(false);
      setDraftName(item.name);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorOpen, item.name]);

  function openEditor() {
    if (isProcessing) return;
    setDraftName(item.name);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setDraftName(item.name);
  }

  function commitName() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== item.name) onRename(trimmed);
  }

  function removeItem() {
    setEditorOpen(false);
    onRemove(item.id);
  }

  const editor =
    editorOpen && !isProcessing
      ? createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end bg-black/40 px-4 pb-4 pt-10 backdrop-blur-[2px] lg:items-center lg:justify-center lg:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${item.name}`}
            onClick={closeEditor}
          >
            <div
              className="w-full rounded-[1.5rem] bg-white p-4 shadow-2xl ring-1 ring-black/10 lg:max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon name="edit" className="h-4 w-4 text-gray-400" />
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") closeEditor();
                    }}
                    className="min-w-0 flex-1 border-b border-gray-200 bg-transparent pb-1 text-lg font-bold text-black outline-none focus:border-black"
                    aria-label="Item name"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-gray-400 hover:bg-gray-50"
                  aria-label="Close item editor"
                >
                  <Icon name="add" className="h-4 w-4 rotate-45" />
                </button>
              </div>

              <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-2xl bg-gray-50 p-4">
                {item.url && (
                  <img
                    src={item.url}
                    alt={item.name}
                    draggable={false}
                    className="h-full w-full object-contain"
                    style={{
                      transform: `rotate(${item.rotation ?? 0}deg)`,
                      transition: "transform 160ms ease",
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onRotate(item.id)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black bg-white px-4 text-base font-bold text-black transition-colors hover:bg-black hover:text-white active:scale-[0.98]"
                >
                  <Icon
                    name="rotate"
                    className="h-4 w-4"
                    maskPosition="62% 48%"
                    maskSize="96%"
                  />
                  Turn
                </button>
                <button
                  type="button"
                  onClick={removeItem}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-4 text-base font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.98]"
                >
                  <Icon name="sub" className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label={`Edit ${item.name}`}
        draggable={!isProcessing}
        onClick={openEditor}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEditor();
          }
        }}
        onDragStart={(e) => {
          if (isProcessing) return;
          const image = e.currentTarget.querySelector("img");
          if (image) {
            const rect = image.getBoundingClientRect();
            e.dataTransfer.setDragImage(image, rect.width / 2, rect.height / 2);
          }
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", dragPayload);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(e.currentTarget, true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget))
            setOver(e.currentTarget, false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(e.currentTarget, false);
          onSwap(e);
        }}
        className="relative group rounded-xl bg-white aspect-square transition-all ring-1 ring-gray-100"
        style={{ cursor: isProcessing ? "default" : "pointer" }}
      >
        <div className="absolute inset-0.5 rounded-lg bg-gray-50">
          {item.url && (
            <img
              src={item.url}
              alt={item.name}
              draggable={false}
              className={`h-full w-full object-contain pointer-events-none ${
                isProcessing ? "opacity-55" : ""
              }`}
              style={{
                transform: `rotate(${item.rotation ?? 0}deg)`,
                transition: "transform 160ms ease",
              }}
            />
          )}
        </div>

        {/* Active: spinner + cancel */}
        {active && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/60">
            {queuePosition && (
              <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black px-2 text-sm font-bold leading-none text-white">
                {queuePosition}
              </span>
            )}
            <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="rounded-full border border-black bg-white px-4 py-2 text-sm font-bold leading-none text-black shadow-sm transition-colors hover:bg-black hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Queued: position number */}
        {queued && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
            <span className="text-2xl leading-none text-gray-300">
              {queuePosition}
            </span>
          </div>
        )}

        {/* Image controls — only when idle */}
        {!isProcessing && (
          <>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(item.id);
              }}
              className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/55 text-white
                         opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-black/80
                         hidden lg:flex items-center justify-center cursor-pointer"
              aria-label="Rotate item"
            >
              <Icon
                name="rotate"
                className="h-3.5 w-3.5"
                maskPosition="62% 48%"
                maskSize="96%"
              />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/55 text-white text-sm
                         opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-black/80
                         hidden lg:flex items-center justify-center leading-none cursor-pointer"
              aria-label="Remove item"
            >
              <Icon name="sub" className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {editor}
    </>
  );
}
