import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  fileToDisplayBlob,
  isHeicFile,
  isUploadableImageFile,
} from "../utils/imageFiles";
import Icon from "./Icon";

export default function UploadModal({
  open,
  onClose,
  onFilesSelected,
  disabled = false,
  maxImages = 9,
}) {
  const libraryInputRef = useRef(null);
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
  const canAddMore = selectedCount < maxImages && !disabled;
  const submitLabel =
    selectedCount === 1 ? "Upload 1 Item" : `Upload ${selectedCount} Items`;

  function updateSelectedItem(id, updater) {
    setSelectedItems((items) =>
      items.map((item) => (item.id === id ? updater(item) : item)),
    );
  }

  function addFiles(fileList) {
    const nextFiles = Array.from(fileList ?? [])
      .filter(isUploadableImageFile)
      .slice(0, maxImages - selectedItems.length);

    if (nextFiles.length === 0) return;

    const nextItems = nextFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: isHeicFile(file) ? null : URL.createObjectURL(file),
    }));

    setSelectedItems((items) => [
      ...items,
      ...nextItems,
    ]);

    nextItems.forEach((item) => {
      if (!isHeicFile(item.file)) return;

      void fileToDisplayBlob(item.file)
        .then((displayBlob) => {
          const url = URL.createObjectURL(displayBlob);
          updateSelectedItem(item.id, (current) => {
            if (current.url) URL.revokeObjectURL(current.url);
            return { ...current, url };
          });
        })
        .catch(() => {
          updateSelectedItem(item.id, (current) => ({ ...current, failed: true }));
        });
    });
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
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return items.filter((item) => item.id !== id);
    });
  }

  function clearSelectedItems() {
    selectedItems.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
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
              Upload Items
            </h2>
            <p className="mt-1 text-sm leading-snug text-gray-500">
              Add up to {maxImages} images, then upload them together.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="zen-icon-button relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-gray-400 hover:bg-gray-50"
            aria-label="Close upload"
          >
            <Icon name="add" className="h-4 w-4 rotate-45" />
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
          className={`zen-card flex min-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed p-5 text-center transition-all sm:min-h-56 ${
            dragActive
              ? "scale-[0.98] border-black bg-gray-50"
              : selectedCount > 0
                ? "border-black bg-gray-50"
                : "border-gray-300 bg-white hover:border-gray-500"
          } ${!canAddMore ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
        >
          <div className="relative mb-5 h-24 w-40">
            {(selectedItems.length > 0 ? selectedItems : Array.from({ length: 5 })).map(
              (item, index, items) => {
                const spread = Math.min(items.length - 1, 6);
                const center = (items.length - 1) / 2;
                const offset = index - center;
                const rotation = offset * (spread > 4 ? 9 : 12);
                const translate = offset * (spread > 4 ? 18 : 22);

                return (
                  <span
                    key={item?.id ?? `empty-fan-${index}`}
                    className="absolute left-1/2 top-3 h-20 w-16 origin-bottom overflow-hidden rounded-2xl border border-white bg-gray-100 shadow-sm ring-1 ring-black/5"
                    style={{
                      transform: `translateX(calc(-50% + ${translate}px)) rotate(${rotation}deg)`,
                      zIndex: index + 1,
                    }}
                  >
                    {item?.url ? (
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : item ? (
                      <span className="flex h-full w-full items-center justify-center bg-gray-100">
                        <span className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
                      </span>
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gray-50 text-2xl font-light text-gray-300">
                        +
                      </span>
                    )}
                  </span>
                );
              },
            )}
          </div>
          {selectedCount > 0 && (
            <span className="mb-2 inline-flex h-7 items-center justify-center rounded-full bg-black px-3 text-xs font-bold text-white">
              {selectedCount} chosen
            </span>
          )}
          <span className="text-base font-bold text-black">
            {selectedCount === maxImages
              ? `${maxImages} images selected`
              : selectedCount > 0
                ? "Ready to upload"
                : "Drag images here"}
          </span>
          <span className="mt-1 text-sm text-gray-500">
            {selectedCount === maxImages
              ? "Remove one to add another"
              : selectedCount > 0
                ? "Tap to add more photos"
                : "or choose from your photo library"}
          </span>
        </button>

        {selectedItems.length > 0 && (
          <div className="mt-3 flex max-h-28 gap-2 overflow-x-auto pb-1">
            {selectedItems.map((item, index) => (
              <div
                key={item.id}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100"
              >
                {item.url ? (
                  <img
                    src={item.url}
                    alt={`Selected upload ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(item.id)}
                  className="zen-icon-button absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                  aria-label={`Remove selected upload ${index + 1}`}
                >
                  <Icon name="add" className="h-3.5 w-3.5 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={selectedCount === 0 ? !canAddMore : disabled}
          onClick={
            selectedCount === 0
              ? () => libraryInputRef.current?.click()
              : handleSubmit
          }
          className="zen-button mt-3 w-full rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {selectedCount === 0 ? "Choose Photos" : submitLabel}
        </button>

        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
