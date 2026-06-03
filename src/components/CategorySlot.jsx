import { useState, useRef } from "react";
import Icon from "./Icon";
import ItemCard from "./ItemCard";
import UploadModal from "./UploadModal";
import {
  useBackgroundRemoval,
  fileToDisplayBlob,
} from "../hooks/useBackgroundRemoval";
import { saveImage, deleteImage } from "../utils/imageStore";

export default function CategorySlot({
  categoryId,
  slots,
  onSlotsChange,
  onCrossMove,
}) {
  const pendingSlotIdx = useRef(null);
  const { removeFromFile } = useBackgroundRemoval();
  const [activeSlot, setActiveSlot] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [queuedSlots, setQueuedSlots] = useState(new Map()); // Map<slotIdx, queuePosition>
  const cancelRef = useRef(false);
  const pendingQueueRef = useRef([]);
  const processingRunRef = useRef(0);

  // Find up to `count` empty slots starting from startIdx, wrapping around
  function findTargetSlots(startIdx, count) {
    const targets = [];
    for (let offset = 0; offset < 3 && targets.length < count; offset++) {
      const i = (startIdx + offset) % 3;
      if (!slots[i]) targets.push(i);
    }
    return targets;
  }

  function handleEmptyClick(slotIdx) {
    if (activeSlot !== null) return;
    pendingSlotIdx.current = slotIdx;
    setUploadOpen(true);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 3);
    const startSlotIdx = pendingSlotIdx.current ?? 0;
    pendingSlotIdx.current = null;
    setUploadOpen(false);

    if (files.length === 0) return;

    const targetSlots = findTargetSlots(startSlotIdx, files.length);
    if (targetSlots.length === 0) return;

    const runId = processingRunRef.current + 1;
    processingRunRef.current = runId;

    const pairs = files.slice(0, targetSlots.length).map((file, idx) => ({
      slotIdx: targetSlots[idx],
      file,
      id: crypto.randomUUID(),
    }));

    // Show original images immediately in all target slots
    for (const { slotIdx, file, id } of pairs) {
      const origUrl = URL.createObjectURL(file);
      onSlotsChange((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          id,
          name: file.name.replace(/\.[^.]+$/, ""),
          rotation: 0,
          url: origUrl,
        };
        return next;
      });
    }

    cancelRef.current = false;
    pendingQueueRef.current = [...pairs];
    setQueuedSlots(new Map(pairs.slice(1).map((p, idx) => [p.slotIdx, idx + 1])));

    for (let idx = 0; idx < pairs.length; idx++) {
      if (cancelRef.current || processingRunRef.current !== runId) break;

      const { slotIdx, file, id } = pairs[idx];
      setQueuedSlots((prev) => { const m = new Map(prev); m.delete(slotIdx); return m; });
      setActiveSlot(slotIdx);
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
        setActiveSlot(null);
        break;
      }

      await saveImage(id, finalBlob).catch(() => {});

      onSlotsChange((prev) => {
        const next = [...prev];
        if (next[slotIdx]?.id === id) {
          next[slotIdx] = { ...next[slotIdx], url: finalUrl };
        }
        return next;
      });

      setActiveSlot(null);
    }

    // Remove any slots that were queued but not processed (cancelled)
    if (cancelRef.current || processingRunRef.current !== runId) {
      const remaining = [...pendingQueueRef.current];
      pendingQueueRef.current = [];
      setQueuedSlots(new Map());
      onSlotsChange((prev) => {
        const next = [...prev];
        for (const { slotIdx, id } of remaining) {
          if (next[slotIdx]?.id === id) next[slotIdx] = null;
        }
        return next;
      });
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
    setQueuedSlots(new Map());
    setActiveSlot(null);
    onSlotsChange((prev) => {
      const next = [...prev];
      for (const { slotIdx, id } of remaining) {
        if (next[slotIdx]?.id === id) next[slotIdx] = null;
      }
      return next;
    });
  }

  function handleRemove(slotIdx) {
    if (activeSlot === slotIdx) return;
    const item = slots[slotIdx];
    if (item) deleteImage(item.id).catch(() => {});
    onSlotsChange((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }

  function handleRotate(slotIdx) {
    if (activeSlot === slotIdx) return;
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
    if (activeSlot === slotIdx) return;
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
            <div className="p-2">
              <ItemCard
                item={item}
                onRemove={() => handleRemove(i)}
                onRotate={() => handleRotate(i)}
                onRename={(name) => handleRename(i, name)}
                dragPayload={JSON.stringify({ catId: categoryId, fromSlotIdx: i })}
                onSwap={(e) => handleSwap(e, i)}
                active={activeSlot === i}
                queued={queuedSlots.has(i)}
                queuePosition={queuedSlots.get(i)}
                onCancel={handleCancel}
              />
            </div>
          </div>
        ) : (
          <div key={`empty-${i}`} className={i < 2 ? "border-b border-gray-300" : ""}>
            <div className="p-2">
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
                className="aspect-square rounded-2xl border border-dashed border-gray-200
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
        disabled={activeSlot !== null}
      />
    </div>
  );
}
