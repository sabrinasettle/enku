import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const bytes = atob(data);
  const buffer = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }

  return new Blob([buffer], { type: mime });
}

async function savePng(dataUrl, filename) {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: blob.type });
  const shouldUseShareSheet =
    navigator.maxTouchPoints > 0 &&
    window.matchMedia?.('(max-width: 1023px)').matches;

  if (shouldUseShareSheet && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Packing grid',
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadGridPng(gridElement) {
  const padding = 8;
  const dataUrl = await toPng(gridElement, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: gridElement.scrollWidth + padding * 2,
    height: gridElement.scrollHeight + padding * 2,
    style: {
      overflow: 'visible',
      padding: `${padding}px`,
    },
  });
  await savePng(dataUrl, 'packing-grid.png');
}

export function downloadOutfitsPdf(outfits) {
  const doc = new jsPDF();
  const PAGE_H = 280;
  const LINE_H = 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sudoku Packing — Outfits', 20, 20);

  let y = 36;

  outfits.forEach(({ label, items }) => {
    if (y + 28 > PAGE_H) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, 20, y);
    y += LINE_H;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    items.forEach(({ item }, i) => {
      doc.text(item ? item.name : `Item ${i + 1}`, 26, y);
      y += LINE_H;
    });

    y += 4;
  });

  doc.save('packing-outfits.pdf');
}
