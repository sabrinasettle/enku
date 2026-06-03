import Icon from "./Icon";

export default function ItemCard({
  item,
  onRemove,
  onRotate,
  dragPayload,
  onSwap,
  active,
  queued,
  queuePosition,
  onCancel,
}) {
  function setOver(el, on) {
    el.dataset.dragOver = on ? "true" : "false";
  }

  const isProcessing = active || queued;

  return (
    <div
      draggable={!isProcessing}
      onDragStart={(e) => {
        if (isProcessing) return;
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
      className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square transition-all"
      style={{ cursor: isProcessing ? "default" : "grab" }}
    >
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

      {/* Active: spinner + cancel */}
      {active && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/60">
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
            className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/50 text-white
                       opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
                       flex items-center justify-center cursor-pointer"
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
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 text-white text-sm
                       opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
                       flex items-center justify-center leading-none cursor-pointer"
            aria-label="Remove item"
          >
            <Icon name="sub" className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
