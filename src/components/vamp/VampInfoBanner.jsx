import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

export default function VampInfoBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <div className="flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800">VAMP Formula: (TC40 + TC15 − CE3.0) ÷ TC05 (Settled CNP Transactions)</p>
            <button onClick={() => setExpanded(v => !v)} className="text-blue-500 hover:text-blue-700 ml-3">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {expanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-800">
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-semibold mb-1">📌 TC40 — Fraud Reports</p>
                <p>Early fraud warnings filed by issuers. Count is the primary numerator input for VAMP.</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-semibold mb-1">📌 TC15 — Disputes / Chargebacks</p>
                <p>Actual chargeback / dispute records filed against the merchant.</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-semibold mb-1">📌 TC05 — Settled Transactions</p>
                <p>Total settled CNP transactions for the month. This is the denominator.</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-semibold mb-1">📌 CE3.0 / RDR Deduction</p>
                <p>Cases resolved via Compelling Evidence 3.0 or RDR can be deducted from the numerator.</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100 sm:col-span-2">
                <p className="font-semibold mb-1">⚠️ Thresholds (Effective April 1, 2025)</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div><p className="font-medium">Visa</p><p>Standard: ≥ 0.90%</p><p>Excessive: ≥ 1.80%</p></div>
                  <div><p className="font-medium">Mastercard</p><p>Standard (MCCM): ≥ 1.00%</p><p>Excessive (ECM): ≥ 1.50%</p></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}