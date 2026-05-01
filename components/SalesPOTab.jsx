'use client';
import React, { useState, useEffect } from 'react';

export default function SalesPOTab() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [platFilter, setPlatFilter] = useState('All');

  useEffect(() => {
    fetch('/api/sales-po')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Loader />;
  if (error || data?.error) return <Err msg={error || data.error} />;

  const platforms = ['All', ...new Set(data.data.map((r) => r.platform))].sort();

  // Sort by total sales descending
  const withTotals = data.data.map((row) => ({
    ...row,
    totalSales: row.weeks.reduce((s, w) => s + w.sales, 0),
  })).sort((a, b) => b.totalSales - a.totalSales);

  const filtered = withTotals.filter((row) => {
    const q = search.toLowerCase();
    const matchQ = !search || row.skuName.toLowerCase().includes(q);
    const matchP = platFilter === 'All' || row.platform === platFilter;
    return matchQ && matchP;
  });

  // Last 2 weeks
  const n = data.weeks.length;
  const last2 = n >= 2 ? [n - 2, n - 1] : [n - 1];
  const last2Label = last2.map((i) => data.weeks[i]).join(' & ');

  // At-risk: PO < 75% of sales over last 2 weeks (with any sales)
  const atRisk = withTotals.filter((row) => {
    const s2 = last2.reduce((s, i) => s + (row.weeks[i]?.sales || 0), 0);
    const p2 = last2.reduce((s, i) => s + (row.weeks[i]?.po || 0), 0);
    if (s2 === 0) return false;
    return p2 < s2 * 0.75;
  }).filter((row) => platFilter === 'All' || row.platform === platFilter);

  // SKUs without names (skuName === skuId means no name found)
  const noName = [...new Set(
    data.data.filter((r) => r.skuName === r.skuId).map((r) => r.skuId)
  )];

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search SKU name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-1">
          {platforms.map((p) => (
            <button key={p} onClick={() => setPlatFilter(p)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${platFilter === p ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <PctBadge sales={100} po={120} /> ≥100%
          <PctBadge sales={100} po={85} /> 75–99%
          <PctBadge sales={100} po={50} /> &lt;75%
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[280px]">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[100px]">Platform</th>
              {data.weeks.map((w, i) => (
                <th key={i} colSpan={3} className="text-center px-2 py-3 font-medium text-slate-600 border-l border-slate-200 min-w-[150px]">{w}</th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400">
              <th className="px-4 py-2" /><th className="px-4 py-2" />
              {data.weeks.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="px-1 py-2 text-center border-l border-slate-200 font-medium w-12">Sales</th>
                  <th className="px-1 py-2 text-center font-medium w-12">PO</th>
                  <th className="px-1 py-2 text-center font-medium w-14">PO%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={2 + data.weeks.length * 3} className="text-center py-14 text-slate-400">No data found</td></tr>
            )}
            {filtered.map((row, idx) => (
              <tr key={`${row.skuId}-${row.platform}`}
                className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                <td className="px-4 py-2.5 max-w-[280px]">
                  <div className="font-medium text-slate-800 truncate text-sm" title={row.skuName}>{row.skuName}</div>
                </td>
                <td className="px-4 py-2.5"><PlatBadge p={row.platform} /></td>
                {row.weeks.map((w, i) => (
                  <React.Fragment key={i}>
                    <td className="px-1 py-2.5 text-center border-l border-slate-100 text-slate-700 tabular-nums text-xs">
                      {w.sales > 0 ? w.sales.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-1 py-2.5 text-center text-slate-700 tabular-nums text-xs">
                      {w.po > 0 ? w.po.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-1 py-2.5 text-center">
                      {w.sales === 0 && w.po === 0 ? <span className="text-slate-300">—</span> : <PctBadge sales={w.sales} po={w.po} />}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{filtered.length} of {data.data.length} SKUs · sorted by total sales ↓</p>

      {/* At-Risk Table */}
      {atRisk.length > 0 && (
        <div className="mt-10">
          <div className="mb-3">
            <span className="text-base font-semibold text-slate-800">⚠️ Under-PO’d SKUs</span>
            <span className="text-sm text-slate-500 ml-2">— PO below 75% of sales over last 2 weeks ({last2Label})</span>
          </div>
          <div className="bg-white rounded-xl border border-red-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-50 border-b border-red-200 text-slate-600 font-medium text-sm">
                  <th className="text-left px-4 py-3 min-w-[280px]">SKU</th>
                  <th className="text-left px-4 py-3 min-w-[100px]">Platform</th>
                  <th className="text-center px-4 py-3 w-24">Sales (2w)</th>
                  <th className="text-center px-4 py-3 w-24">PO (2w)</th>
                  <th className="text-center px-4 py-3 w-20">PO%</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((row, idx) => {
                  const s2 = last2.reduce((s, i) => s + (row.weeks[i]?.sales || 0), 0);
                  const p2 = last2.reduce((s, i) => s + (row.weeks[i]?.po || 0), 0);
                  return (
                    <tr key={`${row.skuId}-${row.platform}-risk`}
                      className={`border-b border-slate-100 hover:bg-red-50/50 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-2.5 max-w-[280px]">
                        <div className="font-medium text-slate-800 truncate" title={row.skuName}>{row.skuName}</div>
                      </td>
                      <td className="px-4 py-2.5"><PlatBadge p={row.platform} /></td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-slate-700">{s2.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-slate-700">{p2.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center"><PctBadge sales={s2} po={p2} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">{atRisk.length} SKUs need attention</p>
        </div>
      )}

      {/* SKUs without names */}
      {noName.length > 0 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-2">📝 {noName.length} SKU ID(s) with no name — please share names for these:</p>
          <div className="flex flex-wrap gap-2">
            {noName.map((id) => (
              <span key={id} className="font-mono text-xs bg-white border border-amber-200 rounded px-2 py-1 text-slate-700">{id}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PctBadge({ sales, po }) {
  if (sales === 0 && po === 0) return <span className="text-slate-300">—</span>;
  if (sales === 0) return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">PO only</span>;
  const pct = Math.round((po / sales) * 100);
  const cls = pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{pct}%</span>;
}

function PlatBadge({ p }) {
  const isZ = p.toLowerCase() === 'zepto';
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${isZ ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{p}</span>;
}

function Loader() {
  return <div className="flex items-center justify-center h-64"><div className="text-slate-400 text-sm animate-pulse">Loading data…</div></div>;
}

function Err({ msg }) {
  return <div className="flex items-center justify-center h-64"><div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">Error: {msg}</div></div>;
}
