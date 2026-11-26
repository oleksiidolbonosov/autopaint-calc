import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calculateDepositSummary,
  calculateEstimateTotals,
  calculateLaborItemTotalUah,
  calculateMaterialItemCostUah,
  convertUahToUsd,
} from '../engine/calculations';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateShort, formatDateTime, formatUah, formatUsd } from './currencyService';
import { AppSettings, Estimate } from '../types/models';

interface FontCache {
  regularBase64: string;
  boldBase64: string;
}

let cachedFonts: FontCache | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function loadDejaVuFonts(): Promise<FontCache> {
  if (cachedFonts) return cachedFonts;
  const [regRes, boldRes] = await Promise.all([
    fetch('/fonts/DejaVuSans.ttf'),
    fetch('/fonts/DejaVuSans-Bold.ttf'),
  ]);
  if (!regRes.ok || !boldRes.ok) {
    throw new Error('Failed to load PDF Cyrillic fonts.');
  }
  const [regBuf, boldBuf] = await Promise.all([
    regRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);
  cachedFonts = {
    regularBase64: arrayBufferToBase64(regBuf),
    boldBase64: arrayBufferToBase64(boldBuf),
  };
  return cachedFonts;
}

function getLastTableY(doc: jsPDF, fallbackY: number): number {
  const withTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return withTable.lastAutoTable?.finalY ?? fallbackY;
}

export interface GeneratedPdfDocument {
  blob: Blob;
  file: File;
  filename: string;
}

export async function generateEstimatePdf(
  estimate: Estimate,
  settings: AppSettings,
  t: TranslationDictionary
): Promise<GeneratedPdfDocument> {
  const fonts = await loadDejaVuFonts();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.addFileToVFS('DejaVuSans.ttf', fonts.regularBase64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.boldBase64);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  doc.setFont('DejaVuSans', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const rate = estimate.exchangeRate.rate;
  const totals = calculateEstimateTotals(estimate);
  const activeMaterials =
    estimate.materialsMode === 'quick' ? estimate.quickMaterials : estimate.detailedMaterials;
  const isFinalPhase = estimate.orderPhase === 'final';
  const doubleSidedSet = new Set(estimate.doubleSidedParts ?? []);
  const depositSummary = calculateDepositSummary(totals.totalUah, estimate.deposit);
  const hasDeposit = depositSummary.expectedUah > 0 || depositSummary.receivedUah > 0;
  const formatPdfMoney = (amountUah: number) =>
    isFinalPhase
      ? formatUah(amountUah, settings.locale)
      : formatUsd(convertUahToUsd(amountUah, rate), settings.locale);

  const ensurePageSpace = (currentY: number, neededHeight: number): number => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      return 16;
    }
    return currentY;
  };

  let y = 15;

  // --- Header Band ---
  doc.setFillColor(15, 23, 42); // Slate-900 accent bar
  doc.rect(marginX, y - 3, contentWidth, 1.2, 'F');
  y += 3;

  // Left: Workshop Info
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  const workshopLines = doc.splitTextToSize(settings.workshopName || 'AutoPaint Calc', 92);
  doc.text(workshopLines, marginX, y);
  let leftY = y + workshopLines.length * 5.2;

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (settings.workshopAddress) {
    const addrLines = doc.splitTextToSize(settings.workshopAddress, 92);
    doc.text(addrLines, marginX, leftY);
    leftY += addrLines.length * 4;
  }
  if (settings.workshopPhone) {
    doc.text(settings.workshopPhone, marginX, leftY);
    leftY += 4;
  }

  // Right: Document Title & Number
  const rightX = pageWidth - marginX;
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text(
    (isFinalPhase
      ? t.customerEstimate.finalDocumentTitle
      : t.customerEstimate.documentTitle
    ).toUpperCase(),
    rightX,
    y,
    { align: 'right' }
  );

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(estimate.estimateNumber, rightX, y + 5.5, { align: 'right' });

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${t.customerEstimate.date}: ${formatDateTime(estimate.createdAt, settings.locale)}`,
    rightX,
    y + 10.5,
    { align: 'right' }
  );

  const orderDateLabel = estimate.orderDate
    ? formatDateShort(estimate.orderDate, settings.locale)
    : formatDateShort(estimate.createdAt, settings.locale);
  const dueDateSegment = estimate.dueDate
    ? `  ·  ${t.estimate.dueDate}: ${formatDateShort(estimate.dueDate, settings.locale)}`
    : '';
  doc.text(`${t.estimate.orderDate}: ${orderDateLabel}${dueDateSegment}`, rightX, y + 14.5, {
    align: 'right',
  });

  y = Math.max(leftY, y + 18) + 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // --- Client & Vehicle Summary Box ---
  const vehicleTitle =
    [estimate.vehicleMake, estimate.vehicleModel, estimate.vehicleYear]
      .filter(Boolean)
      .join(' ') || '—';
  const customerTitle = estimate.customerName || '—';
  const colHalf = (contentWidth - 8) / 2;

  const boxStartY = y;
  const custLines = doc.splitTextToSize(customerTitle, colHalf - 6);
  const vehLines = doc.splitTextToSize(vehicleTitle, colHalf - 6);
  const boxHeight = Math.max(
    18 + custLines.length * 4.5 + (estimate.customerPhone ? 4 : 0),
    18 + vehLines.length * 4.5 + (estimate.vehicleColor ? 4 : 0)
  );

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, boxStartY, contentWidth, boxHeight, 2.5, 2.5, 'FD');

  // Left Col: Customer
  let infoY = boxStartY + 5.5;
  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(t.customerEstimate.customer, marginX + 4, infoY);
  infoY += 4.5;
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(custLines, marginX + 4, infoY);
  infoY += custLines.length * 4.5;
  if (estimate.customerPhone) {
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(estimate.customerPhone, marginX + 4, infoY);
  }

  // Right Col: Vehicle
  const col2X = marginX + colHalf + 8;
  let vehY = boxStartY + 5.5;
  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${t.customerEstimate.vehicle} · ${t.vehicleTypes[estimate.vehicleType ?? 'car']}`,
    col2X,
    vehY
  );
  vehY += 4.5;
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(vehLines, col2X, vehY);
  vehY += vehLines.length * 4.5;
  if (estimate.vehicleColor) {
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(estimate.vehicleColor, col2X, vehY);
  }

  y = boxStartY + boxHeight + 6;

  // --- Selected Parts ---
  if (estimate.selectedParts.length > 0) {
    const partsString = estimate.selectedParts
      .map((pid) =>
        doubleSidedSet.has(pid)
          ? `${t.parts[pid]} (${t.estimate.doubleSidedBadge})`
          : t.parts[pid]
      )
      .join('  ·  ');
    const partsLines = doc.splitTextToSize(partsString, contentWidth);
    y = ensurePageSpace(y, 10 + partsLines.length * 4.2);

    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`${t.customerEstimate.partsTitle} (${estimate.selectedParts.length}):`, marginX, y);
    y += 4.5;

    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(partsLines, marginX, y);
    y += partsLines.length * 4.2 + 5;
  }

  // --- Labor Operations Table ---
  y = ensurePageSpace(y, 24);
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(t.customerEstimate.laborTableTitle, marginX, y);
  y += 2.5;

  if (estimate.laborItems.length === 0) {
    y += 4;
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('—', marginX, y);
    y += 6;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [
        [
          '#',
          t.customerEstimate.colPart,
          t.customerEstimate.colItem,
          t.customerEstimate.colQty,
          isFinalPhase ? t.customerEstimate.colCostUah : t.customerEstimate.colCostUsd,
        ],
      ],
      body: estimate.laborItems.map((item, idx) => {
        const opLabel =
          item.operationType === 'custom'
            ? item.customName || t.operations.custom
            : t.operations[item.operationType];
        const lineUah = calculateLaborItemTotalUah(item, rate);
        const partName = doubleSidedSet.has(item.partId)
          ? `${t.parts[item.partId]} (${t.estimate.doubleSidedBadge})`
          : t.parts[item.partId];
        return [
          String(idx + 1),
          partName,
          opLabel,
          String(item.quantity),
          formatPdfMoney(lineUah),
        ];
      }),
      styles: {
        font: 'DejaVuSans',
        fontSize: 8.2,
        cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        font: 'DejaVuSans',
        fontStyle: 'bold',
        fontSize: 8,
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 46 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 16, halign: 'right' },
        4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
    });
    y = getLastTableY(doc, y) + 7;
  }

  // --- Materials Table ---
  if (activeMaterials.length > 0) {
    y = ensurePageSpace(y, 24);
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(t.customerEstimate.materialsTableTitle, marginX, y);
    y += 2.5;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [
        [
          '#',
          t.customerEstimate.colItem,
          t.customerEstimate.colQty,
          isFinalPhase ? t.customerEstimate.colCostUah : t.customerEstimate.colCostUsd,
        ],
      ],
      body: activeMaterials.map((mat, idx) => {
        const lineUah = calculateMaterialItemCostUah(mat, rate);
        return [
          String(idx + 1),
          mat.name,
          `${mat.quantity} ${t.units[mat.unit]}`,
          formatPdfMoney(lineUah),
        ];
      }),
      styles: {
        font: 'DejaVuSans',
        fontSize: 8.2,
        cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        font: 'DejaVuSans',
        fontStyle: 'bold',
        fontSize: 8,
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
    });
    y = getLastTableY(doc, y) + 7;
  }

  // --- Financial Summary Box ---
  const hasMaterialsSummaryRow =
    activeMaterials.length > 0 || totals.materialsSubtotalUah > 0;
  const hasAdjustment =
    estimate.adjustment.kind !== 'none' && totals.adjustmentAmountUah !== 0;
  const hasPrelimRow =
    estimate.preliminaryTotalUah !== undefined &&
    (isFinalPhase || estimate.preliminaryTotalUah !== totals.totalUah);
  const hasExpectedDepositRow = hasDeposit && depositSummary.expectedUah > 0;
  const extraRows =
    (hasMaterialsSummaryRow ? 1 : 0) +
    (hasAdjustment ? 1 : 0) +
    (hasPrelimRow ? 1 : 0) +
    (hasDeposit ? 2 : 0) +
    (hasExpectedDepositRow ? 1 : 0);
  const summaryBoxHeight = 20.5 + extraRows * 5.5 + (hasDeposit ? 2.5 : 0);
  y = ensurePageSpace(y, summaryBoxHeight + 18);

  const summaryWidth = 98;
  const summaryX = pageWidth - marginX - summaryWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryX, y, summaryWidth, summaryBoxHeight, 2.5, 2.5, 'FD');

  let sy = y + 5.5;
  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(t.estimate.laborSubtotal, summaryX + 4, sy);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfMoney(totals.laborSubtotalUah), pageWidth - marginX - 4, sy, {
    align: 'right',
  });
  sy += 5.5;

  if (hasMaterialsSummaryRow) {
    doc.setTextColor(71, 85, 105);
    doc.text(t.estimate.materialsSubtotal, summaryX + 4, sy);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfMoney(totals.materialsSubtotalUah), pageWidth - marginX - 4, sy, {
      align: 'right',
    });
    sy += 5.5;
  }

  if (hasAdjustment) {
    const adjLabel = `${
      estimate.adjustment.kind === 'discount'
        ? t.estimate.adjustmentDiscount
        : t.estimate.adjustmentMarkup
    } (${estimate.adjustment.value}${
      estimate.adjustment.valueType === 'percent' ? '%' : ' ₴'
    })`;
    const adjSign = totals.adjustmentAmountUah > 0 ? '+' : '';
    doc.setTextColor(71, 85, 105);
    doc.text(adjLabel, summaryX + 4, sy);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${adjSign}${formatPdfMoney(totals.adjustmentAmountUah)}`,
      pageWidth - marginX - 4,
      sy,
      { align: 'right' }
    );
    sy += 5.5;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(summaryX + 4, sy - 2, pageWidth - marginX - 4, sy - 2);
  sy += 3;

  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isFinalPhase ? t.estimate.finalAmount : t.estimate.finalTotal,
    summaryX + 4,
    sy
  );
  doc.setTextColor(29, 78, 216);
  doc.text(formatPdfMoney(totals.totalUah), pageWidth - marginX - 4, sy, {
    align: 'right',
  });
  sy += 5.5;

  if (hasPrelimRow && estimate.preliminaryTotalUah !== undefined) {
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(t.estimate.preliminaryAmount, summaryX + 4, sy);
    doc.text(
      formatUsd(convertUahToUsd(estimate.preliminaryTotalUah, rate), settings.locale),
      pageWidth - marginX - 4,
      sy,
      { align: 'right' }
    );
    sy += 5.5;
  }

  if (hasDeposit) {
    doc.setDrawColor(203, 213, 225);
    doc.line(summaryX + 4, sy - 2, pageWidth - marginX - 4, sy - 2);
    sy += 2.5;
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.2);

    if (hasExpectedDepositRow) {
      doc.setTextColor(100, 116, 139);
      doc.text(t.estimate.depositExpected, summaryX + 4, sy);
      doc.text(formatPdfMoney(depositSummary.expectedUah), pageWidth - marginX - 4, sy, {
        align: 'right',
      });
      sy += 5.5;
    }

    doc.setTextColor(5, 150, 105);
    doc.text(t.estimate.depositReceived, summaryX + 4, sy);
    doc.text(
      `-${formatPdfMoney(depositSummary.receivedUah)}`,
      pageWidth - marginX - 4,
      sy,
      { align: 'right' }
    );
    sy += 5.5;

    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(t.estimate.depositBalanceDue, summaryX + 4, sy);
    doc.text(
      formatPdfMoney(depositSummary.remainingBalanceUah),
      pageWidth - marginX - 4,
      sy,
      { align: 'right' }
    );
  }

  y += summaryBoxHeight + 6;

  // --- Notes ---
  if (estimate.notes && estimate.notes.trim()) {
    const noteLines = doc.splitTextToSize(`${t.estimate.notes}: ${estimate.notes}`, contentWidth - 8);
    const noteBoxH = 6 + noteLines.length * 4.2;
    y = ensurePageSpace(y, noteBoxH + 14);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, contentWidth, noteBoxH, 2, 2, 'FD');
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    doc.text(noteLines, marginX + 4, y + 5);
    y += noteBoxH + 5;
  }

  // --- Rate Footnote & Thank You ---
  const thankLines = doc.splitTextToSize(t.customerEstimate.thankYou, contentWidth);
  y = ensurePageSpace(y, 12 + thankLines.length * 4);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const activeRateNote = isFinalPhase
    ? t.customerEstimate.rateFootnote
    : t.customerEstimate.preliminaryRateFootnote;
  doc.text(`${activeRateNote} 1 USD = ${rate.toFixed(2)} UAH`, marginX, y);
  y += 4.5;
  doc.text(thankLines, marginX, y);

  // --- Page Footer ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AutoPaint Calc · ${estimate.estimateNumber}`,
      marginX,
      pageHeight - 8
    );
    doc.text(`${p} / ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const safeEstNo = estimate.estimateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `AutoPaint_${safeEstNo}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { blob, file, filename };
}

export function triggerPdfDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function shareEstimatePdfDocument(
  estimate: Estimate,
  settings: AppSettings,
  t: TranslationDictionary
): Promise<'shared' | 'cancelled' | 'downloaded_fallback'> {
  const { blob, file, filename } = await generateEstimatePdf(estimate, settings, t);
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const isFinalPhase = estimate.orderPhase === 'final';
    const totalUah = calculateEstimateTotals(estimate).totalUah;
    const shareAmountText = isFinalPhase
      ? formatUah(totalUah, settings.locale)
      : formatUsd(convertUahToUsd(totalUah, estimate.exchangeRate.rate), settings.locale);
    const fullShareData: ShareData = {
      files: [file],
      title: `${t.customerEstimate.estimateNo} ${estimate.estimateNumber}`,
      text: [
        settings.workshopName,
        estimate.customerName,
        `${estimate.vehicleMake} ${estimate.vehicleModel}`.trim(),
        `${isFinalPhase ? t.estimate.finalAmount : t.estimate.phasePreliminary}: ${shareAmountText}`,
      ]
        .filter(Boolean)
        .join(' · '),
    };
    const filesOnlyShareData: ShareData = { files: [file] };
    const candidate = nav.canShare(fullShareData)
      ? fullShareData
      : nav.canShare(filesOnlyShareData)
        ? filesOnlyShareData
        : null;

    if (candidate) {
      try {
        await nav.share(candidate);
        return 'shared';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }

  triggerPdfDownload(blob, filename);
  return 'downloaded_fallback';
}
