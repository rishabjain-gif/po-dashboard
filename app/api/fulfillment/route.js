import { FIRST_WEEK_START, NUM_WEEKS } from '@/lib/config';
import {
  parseDate, normPlatform, isTargetPlatform, getDisplayPlatform,
  getWeekIndex, getWeekLabel, parseNum,
} from '@/lib/dataUtils';
import { fetchPORows, fetchSalesRows, buildSkuNameMap } from '@/lib/sheets';

export const revalidate = 300;

export async function GET() {
  try {
    const [salesRows, poRows] = await Promise.all([fetchSalesRows(), fetchPORows()]);
    const skuNameMap = buildSkuNameMap(salesRows);

    const today = new Date();
    const currentWeekIdx = Math.max(0, getWeekIndex(today, FIRST_WEEK_START));
    const startWeekIdx = Math.max(0, currentWeekIdx - (NUM_WEEKS - 1));
    const weekIndices = [];
    for (let i = startWeekIdx; i <= currentWeekIdx; i++) weekIndices.push(i);
    const weekLabels = weekIndices.map((i) => getWeekLabel(i, FIRST_WEEK_START));

    // fulfillMap[skuId|||normPlat][weekIdx] = { ordered, shipped }
    const fulfillMap = {};
    const platformDisplay = {};

    for (const row of poRows) {
      const skuId = (row['Platform SKU ID'] || '').trim();
      const platform = (row['channel'] || '').trim();
      const reqDateStr = (row['Request Date'] || '').trim();
      const ordered = parseNum(row['total qty']);
      const shipped = parseNum(row['Actual shipped qty']);

      if (!skuId || !platform || !reqDateStr) continue;
      if (!isTargetPlatform(platform)) continue;

      const date = parseDate(reqDateStr);
      if (!date) continue;

      const wIdx = getWeekIndex(date, FIRST_WEEK_START);
      if (!weekIndices.includes(wIdx)) continue;

      const norm = normPlatform(platform);
      const key = `${skuId}|||${norm}`;
      if (!fulfillMap[key]) fulfillMap[key] = {};
      if (!fulfillMap[key][wIdx]) fulfillMap[key][wIdx] = { ordered: 0, shipped: 0 };
      fulfillMap[key][wIdx].ordered += ordered;
      fulfillMap[key][wIdx].shipped += shipped;
      platformDisplay[norm] = platformDisplay[norm] || getDisplayPlatform(platform);
    }

    const data = Object.keys(fulfillMap).map((key) => {
      const [skuId, normPlat] = key.split('|||');
      const weeks = weekIndices.map((wIdx) => {
        const w = fulfillMap[key][wIdx] || { ordered: 0, shipped: 0 };
        const fillRate = w.ordered > 0 ? Math.round((w.shipped / w.ordered) * 100) : null;
        return { ordered: w.ordered, shipped: w.shipped, fillRate };
      });
      return {
        skuId,
        skuName: skuNameMap[skuId] || skuId,
        platform: platformDisplay[normPlat] || normPlat,
        weeks,
      };
    });

    data.sort((a, b) =>
      a.skuName.localeCompare(b.skuName) || a.platform.localeCompare(b.platform)
    );

    return Response.json({ weeks: weekLabels, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[fulfillment]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
