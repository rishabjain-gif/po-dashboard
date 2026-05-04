'use client';
import { useState, useEffect } from 'react';

const STATUS_ORDER = ['overdue_pending', 'late', 'pending', 'on_time'];

const STATUS_CONFIG = {
  on_time:         { label: '✓ On Time',       cls: 'bg-emerald-100 text-emerald-700' },
  late:            { label: 'Late',             cls: 'bg-orange-100 text-orange-700'  },
  pending:         { label: 'Pending',          cls: 'bg-blue-100 text-blue-700'      },
  overdue_pending: { label: 'Overdue',          cls: 'bg-red-100 text-red-700'        },
};

const CARD_COLORS = {
  overdue_pending: 'bg-red-50 border-red-200 text-red-800',
  late:            'bg-orange-50 border-orange-200 text-orange-800',
  pending:         'bg-blue-50 border-blue-200 text-blue-800',
  on_time:         'bg-emerald-50 border-emerald-200 text-emerald-800',
};

const CARD_LABELS = {
  overdue_pending: 'Overdue & Pending',
  late:            'Dispatched Late',
  pending:         'Pending (On Time)',
  on_time:         'On Time',
};

export default function TATTab() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [platFilter, setPlatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetch('/api/tat')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Loader />;
  if (error || data?.error) return <Err msg={error || data.error} />;

  const platforms = ['All', ...new Set(data.data.map((r) => r.platform))].sort();

  const filtered = data.data.filter((row) => {
    const q = search.toLowerCase();
    const matchQ = !search || row.poId.toLowerCase().includes(q);
    const matchP = platFilter === 'All' || row.platform === platFilter;
    const matchS = statusFilter === 'All' || row.status === statusFilter;
    return matchQ && matchP && matchS;
  });

  // Summary counts
  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, data.data.filter((r) => r.status === s).length])
  );

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
            className={`rounded-xl border p-4 text-left transition-all ${CARD_COLORS[s]} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:opacity-90'}`}
          >
            <div className="text-3xl font-bold tabular-nums">{counts[s]}</div>
            <div className="text-xs mt-1 font-medium">{CARD_LABELS[s]}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search PO ID…"
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
        {statusFilter !== 'All' && (
          <button
            onClick={() => setStatusFilter('All')}
            className="text-xs text-indigo-600 hover:underline ml-1"
          >
            Clear filter ×
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <th className="text-left px-4 py-3 min-w-[140px]">PO ID</th>
              <th className="text-left px-4 py-3 min-w-[100px]">Platform</th>
              <th className="text-left px-4 py-3 min-w-[120px]">Request Date</th>
              <th className="text-left px-4 py-3 min-w-[120px]">Deadline</th>
              <th className="text-left px-4 py-3 min-w-[130px]">Dispatch Date</th>
              <th className="text-center px-4 py-3 min-w-[80px]">TAT (d)</th>
              <th className="text-center px-4 py-3 min-w-[70px]">SKUs</th>
              <th className="text-center px-4 py-3 min-w-[90px]">Ordered</th>
              <th className="text-center px-4 py-3 min-w-[90px]">Shipped</th>
              <th className="text-center px-4 py-3 min-w-[130px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-14 text-slate-400">
                  No POs found
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => (
              <tr
                key={`${row.poId}-${idx}`}
                className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.poId || '—'}</td>
                <td className="px-4 py-3"><PlatBadge p={row.platform} /></td>
                <td className="px-4 py-3 text-slate-600 text-xs">{row.requestDate}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{row.deadline}</td>
                <td className="px-4 py-3 text-xs">
                  {row.dispatchDate
                    ? <span className="text-slate-600">{row.dispatchDate}</span>
                    : <span className="text-slate-400 italic">Not dispatched</span>}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                  {row.actualTAT !== null ? row.actualTAT : '—'}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-500 text-xs">
                  {row.skuCount}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                  {row.totalQty > 0 ? row.totalQty.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                  {row.shippedQty > 0 ? row.shippedQty.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        {filtered.length} of {data.data.length} POs · Deadline = PO date + 2 days (Sunday excluded)
      </p>
    </div>
  );
}

function StatusBadge({ row }) {
  const cfg = STATUS_CONFIG[row.status] || { label: row.status, cls: 'bg-slate-100 text-slate-600' };
  const extra =
    row.status === 'late'            ? ` (+${row.daysOverdue}d)` :
    row.status === 'overdue_pending' ? ` (${row.daysOverdue}d)`  : '';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}{extra}
    </span>
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
