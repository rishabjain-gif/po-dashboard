import { FIRST_WEEK_START } from '@/lib/config';
import {
  parseDate, isTargetPlatform, getDisplayPlatform,
  parseNum, calcTATDeadline, diffDays, fmtDateDisp,
} from '@/lib/dataUtils';
import { fetchPORows, fetchSalesRows } from '@/lib/sheets';

export const revalidate = 300;

export async function GET() {
  try {
    const [, poRows] = await Promise.all([fetchSalesRows(), fetchPORows()]);

    const today = new Date();
    const firstDay = new Date(
      FIRST_WEEK_START.getFullYear(),
      FIRST_WEEK_START.getMonth(),
      FIRST_WEEK_START.getDate()
    );

    // Map: poId → aggregated PO record
    const poMap = new Map();

    for (const row of poRows) {
      const skuId   = (row['platform sku id'] || '').trim();
      const platform = (row['channel'] || '').trim();
      const poId    = (row['po id'] || '').trim();
      const reqDateStr  = (row['request date'] || '').trim();
      const dispDateStr = (row['po dispatch date'] || '').trim();
      const totalQty   = parseNum(row['total qty']);
      const shippedQty = parseNum(row['actual shipped qty']);

      if (!skuId || !platform || !reqDateStr) continue;
      if (!isTargetPlatform(platform)) continue;

      const requestDate = parseDate(reqDateStr);
      if (!requestDate) continue;

      // Only include from FIRST_WEEK_START onwards
      const reqNorm = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
      if (reqNorm < firstDay) continue;

      const deadline     = calcTATDeadline(requestDate);
      const dispatchDate = dispDateStr ? parseDate(dispDateStr) : null;

      let status, actualTAT, daysOverdue;

      if (dispatchDate) {
        actualTAT = diffDays(dispatchDate, requestDate);
        const overdue = diffDays(dispatchDate, deadline);
        daysOverdue = Math.max(0, overdue);
        status = overdue > 0 ? 'late' : 'on_time';
      } else {
        actualTAT = null;
        const overdue = diffDays(today, deadline);
        daysOverdue = Math.max(0, overdue);
        status = overdue > 0 ? 'overdue_pending' : 'pending';
      }

      if (poMap.has(poId)) {
        const existing = poMap.get(poId);
        existing.totalQty   += totalQty;
        existing.shippedQty += shippedQty;
        existing.skuCount   += 1;
      } else {
        poMap.set(poId, {
          poId,
          platform: getDisplayPlatform(platform),
          requestDate:  fmtDateDisp(requestDate),
          dispatchDate: dispatchDate ? fmtDateDisp(dispatchDate) : null,
          deadline:     fmtDateDisp(deadline),
          actualTAT,
          status,
          daysOverdue,
          totalQty,
          shippedQty,
          skuCount: 1,
        });
      }
    }

    const data = [...poMap.values()];

    // Sort: overdue_pending → late → pending → on_time
    const ORDER = { overdue_pending: 0, late: 1, pending: 2, on_time: 3 };
    data.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));

    return Response.json({ data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[tat]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
