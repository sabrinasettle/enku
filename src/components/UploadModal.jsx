import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function UploadModal({
  open,
  onClose,
  onFilesSelected,
  disabled = false,
}) {
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      setSelectedItems((items) => {
        items.forEach((item) => URL.revokeObjectURL(item.url));
        return [];
      });
      setDragActive(false);
      onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const selectedCount = selectedItems.length;
  const canAddMore = selectedCount < 3 && !disabled;
  const submitLabel =
    selectedCount === 1 ? "Upload 1 Item" : `Upload ${selectedCount} Items`;

  function addFiles(fileList) {
    const nextFiles = Array.from(fileList ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 3 - selectedItems.length);

    if (nextFiles.length === 0) return;

    setSelectedItems((items) => [
      ...items,
      ...nextFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleInputChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    if (!canAddMore) return;
    addFiles(event.dataTransfer.files);
  }

  function handleRemoveSelected(id) {
    setSelectedItems((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return items.filter((item) => item.id !== id);
    });
  }

  function clearSelectedItems() {
    selectedItems.forEach((item) => URL.revokeObjectURL(item.url));
    setSelectedItems([]);
    setDragActive(false);
  }

  function handleClose() {
    clearSelectedItems();
    onClose();
  }

  function handleSubmit() {
    if (selectedItems.length === 0 || disabled) return;
    const files = selectedItems.map((item) => item.file);
    clearSelectedItems();
    onFilesSelected(files);
  }

  const modal = (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-4 shadow-2xl ring-1 ring-black/10 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="upload-modal-title"
              className="text-lg font-bold leading-tight text-black"
            >
          Upload item
            </h2>
            <p className="mt-1 text-sm leading-snug text-gray-500">
              Add up to 3 images, then upload them together.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-gray-400"
            aria-label="Close upload"
          >
            <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-current" />
            <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-current" />
          </button>
        </div>

        <button
          type="button"
          disabled={!canAddMore}
          onClick={() => libraryInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            if (canAddMore) setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (canAddMore) setDragActive(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragActive(false);
            }
          }}
          onDrop={handleDrop}
          className={`flex min-h-48 w-full flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center transition-all sm:min-h-56 ${
            dragActive
              ? "scale-[0.98] border-black bg-gray-50"
              : "border-gray-300 bg-white hover:border-gray-500"
          } ${!canAddMore ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black text-3xl font-light leading-none text-white">
            +
          </span>
          <span className="text-base font-bold text-black">
            {selectedCount === 3 ? "3 images selected" : "Drag images here"}
          </span>
          <span className="mt-1 text-sm text-gray-500">
            {selectedCount === 3
              ? "Remove one to add another"
              : "or choose from your photo library"}
          </span>
        </button>

        {selectedItems.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {selectedItems.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
              >
                <img
                  src={item.url}
                  alt={`Selected upload ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(item.id)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label={`Remove selected upload ${index + 1}`}
                >
                  <span className="absolute h-0.5 w-3 rotate-45 rounded-full bg-current" />
                  <span className="absolute h-0.5 w-3 -rotate-45 rounded-full bg-current" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!canAddMore}
            onClick={() => cameraInputRef.current?.click()}
            className="rounded-2xl border border-black bg-black px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Take Photo
          </button>
          <button
            type="button"
            disabled={!canAddMore}
            onClick={() => libraryInputRef.current?.click()}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-55"
          >
            Choose Photos
          </button>
        </div>

        <button
          type="button"
          disabled={selectedCount === 0 || disabled}
          onClick={handleSubmit}
          className="mt-3 w-full rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {selectedCount === 0 ? "Select Images" : submitLabel}
        </button>

        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
