import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export async function downloadGridPng(gridElement) {
  const dataUrl = await toPng(gridElement, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  });
  const link = document.createElement('a');
  link.download = 'packing-grid.png';
  link.href = dataUrl;
  link.click();
}

export function downloadOutfitsPdf(outfits) {
  const doc = new jsPDF();
  const PAGE_H = 280;
  const LINE_H = 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sudoku Packing — Outfits', 20, 20);

  let y = 36;

  outfits.forEach((outfit, idx) => {
    if (y + 28 > PAGE_H) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Outfit ${idx + 1}`, 20, y);
    y += LINE_H;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    outfit.forEach(({ item, col, row }, i) => {
      const label = item
        ? `${item.name} — Col ${col} Row ${row}`
        : `Item ${i + 1} — [Col ${col} Row ${row}]`;
      doc.text(label, 26, y);
      y += LINE_H;
    });

    y += 4;
  });

  doc.save('packing-outfits.pdf');
}
