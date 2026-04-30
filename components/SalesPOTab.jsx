'use client';
import React, { useState, useEffect } from 'react';

export default function SalesPOTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
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

  const filtered = data.data.filter((row) => {
    const q = search.toLowerCase();
    const matchQ = !search || row.skuName.toLowerCase().includes(q) || row.skuId.toLowerCase().includes(q);
    const matchP = platFilter === 'All' || row.platform === platFilter;
    return matchQ && matchP;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search SKU name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-1">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatFilter(p)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                platFilter === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            PO ≥ Sales
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            PO &lt; Sales
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[200px]">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[110px]">Platform</th>
              {data.weeks.map((w, i) => (
                <th key={i} colSpan={3} className="text-center px-4 py-3 font-medium text-slate-600 border-l border-slate-200 min-w-[190px]">
                  {w}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400">
              <th className="px-4 py-2" />
              <th className="px-4 py-2" />
              {data.weeks.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="px-3 py-2 text-center border-l border-slate-200 font-medium">Sales</th>
                  <th className="px-3 py-2 text-center font-medium">PO</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={2 + data.weeks.length * 3} className="text-center py-14 text-slate-400">
                  No data found
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => (
              <tr
                key={`${row.skuId}-${row.platform}`}
                className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 truncate max-w-[180px]" title={row.skuName}>
                    {row.skuName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{row.skuId}</div>
                </td>
                <td className="px-4 py-3">
                  <PlatBadge p={row.platform} />
                </td>
                {row.weeks.map((w, i) => (
                  <React.Fragment key={i}>
                    <td className="px-3 py-3 text-center border-l border-slate-100 text-slate-700 tabular-nums">
                      {w.sales > 0 ? w.sales.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700 tabular-nums">
                      {w.po > 0 ? w.po.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {w.sales === 0 && w.po === 0 ? (
                        <span className="text-slate-200">—</span>
                      ) : (
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${w.ok ? 'bg-emerald-400' : 'bg-red-400'}`}
                          title={w.ok ? 'PO ≥ Sales' : 'PO < Sales'}
                        />
                      )}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        {filtered.length} of {data.data.length} SKU-platform combinations · Weeks Mon–Sun from 30 Mar 2026
      </p>
    </div>
  );
}

function PlatBadge({ p }) {
  const isZ = p.toLowerCase() === 'zepto';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${isZ ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
      {p}
    </span>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm animate-pulse">Loading data…</div>
    </div>
  );
}

function Err({ msg }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        Error: {msg}
      </div>
    </div>
  );
}
