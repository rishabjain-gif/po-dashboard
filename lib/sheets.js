import { parseCSV } from './dataUtils';
import { SALES_SHEET_URL, PO_SHEET_URL } from './config';

const _cache = {};

function getCached(k) {
  const e = _cache[k];
  return e && Date.now() - e.ts < 300_000 ? e.data : null; // 5-min TTL
}

function setCached(k, d) {
  _cache[k] = { data: d, ts: Date.now() };
}

// Normalise all row keys to lowercase for consistent column access
function normalizeRows(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k.toLowerCase()] = v;
    return out;
  });
}

async function fetchCSV(url, skipFirstRow = false) {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status}): ${url}`);
  let text = await res.text();
  if (skipFirstRow) {
    const idx = text.indexOf('\n');
    text = idx >= 0 ? text.slice(idx + 1) : text;
  }
  return normalizeRows(parseCSV(text));
}

export async function fetchSalesRows() {
  const cached = getCached('sales');
  if (cached) return cached;
  const rows = await fetchCSV(SALES_SHEET_URL, true); // skip summary row above headers
  setCached('sales', rows);
  return rows;
}

export async function fetchPORows() {
  const cached = getCached('po');
  if (cached) return cached;
  const rows = await fetchCSV(PO_SHEET_URL);
  setCached('po', rows);
  return rows;
}

// skuId -> skuName map built from sales sheet
export function buildSkuNameMap(salesRows) {
  const map = {};
  for (const row of salesRows) {
    const id = (row['item_id'] || '').trim();
    const name = (row['item_name'] || '').trim();
    if (id && name && !map[id]) map[id] = name;
  }
  return map;
}
