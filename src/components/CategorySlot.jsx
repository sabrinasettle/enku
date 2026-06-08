import { useState, useRef } from "react";
import Icon from "./Icon";
import ItemCard from "./ItemCard";
import UploadModal from "./UploadModal";
import {
  useBackgroundRemoval,
  fileToDisplayBlob,
} from "../hooks/useBackgroundRemoval";
import { saveImage, deleteImage } from "../utils/imageStore";
import { isUploadableImageFile } from "../utils/imageFiles";

export default function CategorySlot({
  categoryId,
  categories,
  slots,
  onSlotsChange,
  onCategoriesChange,
  onCrossMove,
}) {
  const pendingSlotIdx = useRef(null);
  const { removeFromFile } = useBackgroundRemoval();
  const [uploadOpen, setUploadOpen] = useState(false);
  const cancelRef = useRef(false);
  const pendingQueueRef = useRef([]);
  const processingRunRef = useRef(0);

  function getUploadTargets(startIdx, count) {
    const sourceCategories = categories ?? [{ id: categoryId, slots }];
    const startCatIndex = Math.max(
      0,
      sourceCategories.findIndex((cat) => cat.id === categoryId),
    );
    const flatSlots = sourceCategories.flatMap((cat, catIndex) =>
      cat.slots.map((item, slotIdx) => ({
        catId: cat.id,
        catIndex,
        slotIdx,
        item,
      })),
    );
    const startFlatIndex = Math.max(
      0,
      flatSlots.findIndex(
        (slot) => slot.catIndex === startCatIndex && slot.slotIdx === startIdx,
      ),
    );
    const targets = [];
    for (let offset = 0; offset < flatSlots.length && targets.length < count; offset++) {
      const slot = flatSlots[(startFlatIndex + offset) % flatSlots.length];
      if (!slot.item) targets.push(slot);
    }
    return targets;
  }

  const filledSlotCount = (categories ?? [{ slots }]).reduce(
    (total, cat) => total + cat.slots.filter(Boolean).length,
    0,
  );
  const maxUploadImages = Math.max(1, 9 - filledSlotCount);
  const isProcessing = (categories ?? [{ slots }]).some((cat) =>
    cat.slots.some((item) => item?.uploadStatus),
  );

  function updateUploadItem(catId, slotIdx, id, updater) {
    if (onCategoriesChange) {
      onCategoriesChange((prev) =>
        prev.map((cat) => {
          if (cat.id !== catId) return cat;
          const next = [...cat.slots];
          if (next[slotIdx]?.id === id) {
            next[slotIdx] = updater(next[slotIdx]);
          }
          return { ...cat, slots: next };
        }),
      );
      return;
    }

    onSlotsChange((prev) => {
      const next = [...prev];
      if (next[slotIdx]?.id === id) {
        next[slotIdx] = updater(next[slotIdx]);
      }
      return next;
    });
  }

  function removeUploadItems(items) {
    if (onCategoriesChange) {
      onCategoriesChange((prev) =>
        prev.map((cat) => {
          const next = [...cat.slots];
          items.forEach(({ catId, slotIdx, id }) => {
            if (cat.id === catId && next[slotIdx]?.id === id) next[slotIdx] = null;
          });
          return { ...cat, slots: next };
        }),
      );
      return;
    }

    onSlotsChange((prev) => {
      const next = [...prev];
      for (const { slotIdx, id } of items) {
        if (next[slotIdx]?.id === id) next[slotIdx] = null;
      }
      return next;
    });
  }

  function handleEmptyClick(slotIdx) {
    if (isProcessing) return;
    pendingSlotIdx.current = slotIdx;
    setUploadOpen(true);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
      .filter(isUploadableImageFile)
      .slice(0, maxUploadImages);
    const startSlotIdx = pendingSlotIdx.current ?? 0;
    pendingSlotIdx.current = null;
    setUploadOpen(false);

    if (files.length === 0) return;

    const targetSlots = getUploadTargets(startSlotIdx, files.length);
    if (targetSlots.length === 0) return;

    const runId = processingRunRef.current + 1;
    processingRunRef.current = runId;

    const pairs = files.slice(0, targetSlots.length).map((file, idx) => ({
      catId: targetSlots[idx].catId,
      slotIdx: targetSlots[idx].slotIdx,
      file,
      id: crypto.randomUUID(),
    }));

    // Reserve target slots immediately; images appear after background removal.
    for (const { catId, slotIdx, file, id } of pairs) {
      const item = {
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        rotation: 0,
        url: null,
        uploadStatus: "queued",
        queuePosition: pairs.findIndex((pair) => pair.id === id) + 1,
      };
      if (onCategoriesChange) {
        onCategoriesChange((prev) =>
          prev.map((cat) => {
            if (cat.id !== catId) return cat;
            const next = [...cat.slots];
            next[slotIdx] = item;
            return { ...cat, slots: next };
          }),
        );
      } else {
        onSlotsChange((prev) => {
          const next = [...prev];
          next[slotIdx] = item;
          return next;
        });
      }
    }

    cancelRef.current = false;
    pendingQueueRef.current = [...pairs];

    for (let idx = 0; idx < pairs.length; idx++) {
      if (cancelRef.current || processingRunRef.current !== runId) break;

      const { catId, slotIdx, file, id } = pairs[idx];
      updateUploadItem(catId, slotIdx, id, (item) => ({
        ...item,
        uploadStatus: "active",
        queuePosition: idx + 1,
      }));
      pendingQueueRef.current = pairs.slice(idx + 1);

      let finalBlob, finalUrl;
      try {
        const result = await removeFromFile(file);
        finalBlob = result.blob;
        finalUrl = result.url;
      } catch (err) {
        console.warn("Background removal failed; keeping original image.", err);
        finalBlob = await fileToDisplayBlob(file);
        finalUrl = URL.createObjectURL(finalBlob);
      }

      if (cancelRef.current || processingRunRef.current !== runId) {
        break;
      }

      await saveImage(id, finalBlob).catch(() => {});

      updateUploadItem(catId, slotIdx, id, (item) => {
        const completeItem = { ...item };
        delete completeItem.uploadStatus;
        delete completeItem.queuePosition;
        return { ...completeItem, url: finalUrl };
      });
    }

    // Remove any slots that were queued but not processed (cancelled)
    if (cancelRef.current || processingRunRef.current !== runId) {
      const remaining = [...pendingQueueRef.current];
      pendingQueueRef.current = [];
      removeUploadItems(remaining);
    }
  }

  function handleUploadClose() {
    pendingSlotIdx.current = null;
    setUploadOpen(false);
  }

  function handleCancel() {
    cancelRef.current = true;
    processingRunRef.current += 1;
    const remaining = [...pendingQueueRef.current];
    pendingQueueRef.current = [];
    const activeItems = (categories ?? [{ id: categoryId, slots }]).flatMap((cat) =>
      cat.slots
        .map((item, slotIdx) => ({ catId: cat.id, slotIdx, id: item?.id, item }))
        .filter(({ item }) => item?.uploadStatus),
    );
    removeUploadItems([...remaining, ...activeItems]);
  }

  function handleRemove(slotIdx) {
    if (slots[slotIdx]?.uploadStatus) return;
    const item = slots[slotIdx];
    if (item) deleteImage(item.id).catch(() => {});
    onSlotsChange((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }

  function handleRotate(slotIdx) {
    if (slots[slotIdx]?.uploadStatus) return;
    onSlotsChange((prev) => {
      const next = [...prev];
      if (next[slotIdx]) {
        next[slotIdx] = {
          ...next[slotIdx],
          rotation: (next[slotIdx].rotation ?? 0) + 90,
        };
      }
      return next;
    });
  }

  function handleRename(slotIdx, name) {
    if (slots[slotIdx]?.uploadStatus) return;
    onSlotsChange((prev) => {
      const next = [...prev];
      if (next[slotIdx]) {
        next[slotIdx] = {
          ...next[slotIdx],
          name,
        };
      }
      return next;
    });
  }

  function parseDrop(e) {
    try {
      return JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return null;
    }
  }

  function handleSwap(e, toSlotIdx) {
    const data = parseDrop(e);
    if (!data) return;
    const { catId: fromCatId, fromSlotIdx } = data;

    if (fromCatId === categoryId) {
      if (fromSlotIdx === toSlotIdx) return;
      onSlotsChange((prev) => {
        const next = [...prev];
        [next[fromSlotIdx], next[toSlotIdx]] = [next[toSlotIdx], next[fromSlotIdx]];
        return next;
      });
    } else {
      onCrossMove(fromCatId, fromSlotIdx, categoryId, toSlotIdx);
    }
  }

  function setOver(el, on) {
    el.dataset.dragOver = on ? "true" : "false";
  }

  return (
    <div>
      {slots.map((item, i) =>
        item ? (
          <div key={item.id} className={i < 2 ? "border-b border-gray-300" : ""}>
            <div className="p-1">
              <ItemCard
                item={item}
                onRemove={() => handleRemove(i)}
                onRotate={() => handleRotate(i)}
                onRename={(name) => handleRename(i, name)}
                dragPayload={JSON.stringify({ catId: categoryId, fromSlotIdx: i })}
                onSwap={(e) => handleSwap(e, i)}
                active={item.uploadStatus === "active"}
                queued={item.uploadStatus === "queued"}
                queuePosition={item.queuePosition}
                onCancel={handleCancel}
              />
            </div>
          </div>
        ) : (
          <div key={`empty-${i}`} className={i < 2 ? "border-b border-gray-300" : ""}>
            <div className="p-1">
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleEmptyClick(i)}
                onKeyDown={(e) => e.key === "Enter" && handleEmptyClick(i)}
                onDragOver={(e) => { e.preventDefault(); setOver(e.currentTarget, true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(e.currentTarget, false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(e.currentTarget, false);
                  if (e.dataTransfer.files.length > 0) {
                    pendingSlotIdx.current = i;
                    handleFiles(e.dataTransfer.files);
                    return;
                  }
                  handleSwap(e, i);
                }}
                className="aspect-square rounded-xl border border-dashed border-gray-200
                           flex items-center justify-center transition-colors select-none cursor-pointer
                           hover:border-gray-400"
              >
                <Icon
                  name="add"
                  className="pointer-events-none h-8 w-8 text-gray-300"
                />
              </div>
            </div>
          </div>
        ),
      )}

      <UploadModal
        open={uploadOpen}
        onClose={handleUploadClose}
        onFilesSelected={handleFiles}
        disabled={isProcessing}
        maxImages={maxUploadImages}
      />
    </div>
  );
}
