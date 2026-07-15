import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ColumnDef } from "./definitions";

const PAGE_WIDTH = 841.89; // A4 horizontal
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const ROW_HEIGHT = 16;
const FONT_SIZE = 8;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 16).replace("T", " ");
  return String(value).slice(0, 60);
}

export async function renderPdf(
  title: string,
  columns: ColumnDef[],
  rows: Array<Record<string, unknown>>,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const usableWidth = PAGE_WIDTH - MARGIN * 2;
  const colWidth = usableWidth / columns.length;
  const rowsPerPage = Math.floor((PAGE_HEIGHT - MARGIN * 2 - 60) / ROW_HEIGHT);

  function drawHeader(page: import("pdf-lib").PDFPage, y: number) {
    page.drawText(title, { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 14, font: boldFont });
    page.drawText(`Generado ${new Date().toLocaleString("es-AR")} — ${rows.length} registros`, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 16,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    columns.forEach((c, i) => {
      page.drawText(c.label, { x: MARGIN + i * colWidth, y, size: FONT_SIZE, font: boldFont });
    });
  }

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN - 50;
  drawHeader(page, y);
  y -= ROW_HEIGHT;
  let rowsOnPage = 0;

  for (const row of rows) {
    if (rowsOnPage >= rowsPerPage) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 50;
      drawHeader(page, y);
      y -= ROW_HEIGHT;
      rowsOnPage = 0;
    }
    columns.forEach((c, i) => {
      page.drawText(formatCell(row[c.key]), { x: MARGIN + i * colWidth, y, size: FONT_SIZE, font });
    });
    y -= ROW_HEIGHT;
    rowsOnPage += 1;
  }

  if (rows.length === 0) {
    page.drawText("Sin registros para los filtros seleccionados.", { x: MARGIN, y, size: FONT_SIZE, font });
  }

  return Buffer.from(await doc.save());
}
