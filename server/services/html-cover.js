import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { buildHtmlCoverDocument, buildHtmlCoverModel } from '../../src/utils/htmlCover.js';

function toAssetSrc(value, workdir) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('file://') || raw.startsWith('data:')) return raw;
  return pathToFileURL(path.join(workdir, raw)).href;
}

export async function renderHtmlCoverPdf(payload, workdir, outputPath) {
  const model = buildHtmlCoverModel(payload, (value) => toAssetSrc(value, workdir));
  const html = buildHtmlCoverDocument(model);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    await browser.close();
  }
}

export async function mergePdfFiles(paths) {
  const merged = await PDFDocument.create();
  for (const filePath of paths) {
    const source = await PDFDocument.load(await fs.readFile(filePath));
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return Buffer.from(await merged.save());
}
