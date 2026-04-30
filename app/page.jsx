'use client';
import { useState } from 'react';
import SalesPOTab from '@/components/SalesPOTab';
import FulfillmentTab from '@/components/FulfillmentTab';
import TATTab from '@/components/TATTab';

const TABS = [
  { id: 'sales-po',     label: 'Sales vs PO' },
  { id: 'fulfillment',  label: 'PO Fulfillment' },
  { id: 'tat',          label: 'TAT Tracker' },
];

export default function Home() {
  const [active, setActive] = useState('sales-po');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-slate-800">Quick Commerce PO Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Zepto &amp; Instamart · Weekly tracking</p>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {active === 'sales-po'    && <SalesPOTab />}
        {active === 'fulfillment' && <FulfillmentTab />}
        {active === 'tat'         && <TATTab />}
      </div>
    </div>
  );
}
