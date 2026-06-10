import { useState } from "react";
import Icon from "./Icon";

export default function DetailsPanel({
  categories,
  onRename,
  variant = "sidebar",
  showTitle = true,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const isFullscreen = variant === "fullscreen";

  const items = categories.flatMap((cat, colIdx) =>
    cat.slots
      .map((item, rowIdx) =>
        item
          ? {
              ...item,
              catId: cat.id,
              slotIdx: rowIdx,
              col: colIdx + 1,
              row: rowIdx + 1,
            }
          : null,
      )
      .filter(Boolean),
  );

  function startEdit(item) {
    setEditingId(item.id);
    setEditValue(item.name);
  }

  function commitEdit(item) {
    const trimmed = editValue.trim();
    if (trimmed) onRename(item.catId, item.slotIdx, trimmed);
    setEditingId(null);
  }

  if (items.length === 0) return null;

  return (
    <div className={isFullscreen ? "flex flex-col gap-5" : "flex flex-col gap-5"}>
      {showTitle && (
        <h3
          className={
            isFullscreen
              ? "text-lg font-bold text-black"
              : "text-base lg:text-sm text-gray-500"
          }
        >
          All Items
        </h3>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className={`zen-enter flex items-center ${
            isFullscreen ? "gap-4" : "gap-3"
          }`}
        >
          <div
            className={`shrink-0 rounded bg-gray-100 overflow-hidden ${
              isFullscreen ? "w-24 h-24" : "w-12 h-12"
            }`}
          >
            <img
              src={item.url}
              alt={item.name}
              className="w-full h-full object-contain"
              style={{ transform: `rotate(${item.rotation ?? 0}deg)` }}
            />
          </div>

          {editingId === item.id ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(item);
                if (e.key === "Escape") setEditingId(null);
              }}
              className={`flex-1 border-b border-gray-300 outline-none bg-transparent pb-0.5 ${
                isFullscreen ? "text-base" : "text-base lg:text-sm"
              }`}
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                className={`truncate ${
                  isFullscreen ? "text-base" : "text-base lg:text-sm"
                }`}
              >
                {item.name}
              </span>
              <button
                onClick={() => startEdit(item)}
                className="zen-icon-button text-gray-400 hover:text-black transition-colors shrink-0 text-sm leading-none"
                aria-label="Rename item"
              >
                <Icon name="edit" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
