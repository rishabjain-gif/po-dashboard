import { FIRST_WEEK_START, NUM_WEEKS } from '@/lib/config';
import {
  parseDate, normPlatform, isTargetPlatform, getDisplayPlatform,
  getWeekIndex, getWeekLabel, parseNum,
} from '@/lib/dataUtils';
import { fetchSalesRows, fetchPORows } from '@/lib/sheets';

export const revalidate = 300;

export async function GET() {
  try {
    const [salesRows, poRows] = await Promise.all([fetchSalesRows(), fetchPORows()]);

    // Determine the 5 weeks to show (most recent NUM_WEEKS weeks up to today)
    const today = new Date();
    const currentWeekIdx = Math.max(0, getWeekIndex(today, FIRST_WEEK_START));
    const startWeekIdx = Math.max(0, currentWeekIdx - (NUM_WEEKS - 1));
    const weekIndices = [];
    for (let i = startWeekIdx; i <= currentWeekIdx; i++) weekIndices.push(i);
    const weekLabels = weekIndices.map((i) => getWeekLabel(i, FIRST_WEEK_START));

    // Aggregate sales: salesMap[skuId|||normPlat][weekIdx] = total qty
    const salesMap = {};
    const skuNames = {};
    const platformDisplay = {};

    for (const row of salesRows) {
      const skuId = (row['item_id'] || '').trim();
      const skuName = (row['item_name'] || '').trim();
      const platform = (row['platform'] || '').trim();
      const date = parseDate(row['date']);
      const qty = parseNum(row['Sum of qty_sold']);

      if (!skuId || !platform || !date || qty <= 0) continue;
      if (!isTargetPlatform(platform)) continue;

      const wIdx = getWeekIndex(date, FIRST_WEEK_START);
      if (!weekIndices.includes(wIdx)) continue;

      const norm = normPlatform(platform);
      const key = `${skuId}|||${norm}`;
      if (!salesMap[key]) salesMap[key] = {};
      salesMap[key][wIdx] = (salesMap[key][wIdx] || 0) + qty;
      if (skuName) skuNames[skuId] = skuName;
      platformDisplay[norm] = getDisplayPlatform(platform);
    }

    // Aggregate PO: poMap[skuId|||normPlat][weekIdx] = total qty ordered
    const poMap = {};

    for (const row of poRows) {
      const skuId = (row['Platform SKU ID'] || '').trim();
      const platform = (row['channel'] || '').trim();
      const reqDateStr = (row['Request Date'] || '').trim();
      const qty = parseNum(row['total qty']);

      if (!skuId || !platform || !reqDateStr) continue;
      if (!isTargetPlatform(platform)) continue;

      const date = parseDate(reqDateStr);
      if (!date) continue;

      const wIdx = getWeekIndex(date, FIRST_WEEK_START);
      if (!weekIndices.includes(wIdx)) continue;

      const norm = normPlatform(platform);
      const key = `${skuId}|||${norm}`;
      if (!poMap[key]) poMap[key] = {};
      poMap[key][wIdx] = (poMap[key][wIdx] || 0) + qty;
      platformDisplay[norm] = platformDisplay[norm] || getDisplayPlatform(platform);
    }

    // Union of all keys
    const allKeys = new Set([...Object.keys(salesMap), ...Object.keys(poMap)]);
    const data = [];

    for (const key of allKeys) {
      const [skuId, normPlat] = key.split('|||');
      const weeks = weekIndices.map((wIdx) => {
        const sales = (salesMap[key]?.[wIdx]) || 0;
        const po = (poMap[key]?.[wIdx]) || 0;
        return { sales, po, ok: po >= sales };
      });
      data.push({
        skuId,
        skuName: skuNames[skuId] || skuId,
        platform: platformDisplay[normPlat] || normPlat,
        weeks,
      });
    }

    data.sort((a, b) =>
      a.skuName.localeCompare(b.skuName) || a.platform.localeCompare(b.platform)
    );

    return Response.json({ weeks: weekLabels, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[sales-po]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
