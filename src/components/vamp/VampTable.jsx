import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, XCircle, Info, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";

const RISK_CONFIG = {
  healthy:   { label: "Healthy",        badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  standard:  { label: "Standard Risk",  badge: "bg-amber-100 text-amber-700",   icon: AlertTriangle },
  excessive: { label: "Excessive Risk", badge: "bg-red-100 text-red-700",       icon: XCircle },
  unknown:   { label: "No Txn Data",    badge: "bg-slate-100 text-slate-500",   icon: Info },
};

export default function VampTable({ rows, sortBy, sortDir, onSort, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = (row) => { setEditing(row.id); setEditData({ ...row }); };
  const cancelEdit = () => { setEditing(null); setEditData({}); };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.VampTransaction.update(editing, editData);
    setSaving(false);
    cancelEdit();
    onRefresh();
  };

  const deleteRow = async (id) => {
    if (!window.confirm("Delete this VAMP record?")) return;
    await base44.entities.VampTransaction.delete(id);
    onRefresh();
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3 inline ml-1 text-[#0D50B8]" /> : <ChevronUp className="w-3 h-3 inline ml-1 text-[#0D50B8]" />;
  };

  const Th = ({ label, field }) => (
    <th
      className={`text-left px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap ${field ? "cursor-pointer hover:text-[#0D50B8]" : ""} transition-colors`}
      onClick={() => field && onSort(field)}
    >
      {label}<SortIcon field={field} />
    </th>
  );

  const numInput = (key, placeholder) => (
    <input
      type="number" min="0"
      value={editData[key] ?? ""}
      onChange={e => setEditData(p => ({ ...p, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
      placeholder={placeholder}
      className="w-28 border border-blue-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{rows.length} record{rows.length !== 1 ? "s" : ""}</p>
        <p className="text-xs text-slate-400">Click column headers to sort · Inline edit available</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <Th label="MID" />
              <Th label="Alias / DBA" />
              <Th label="Period" field="period_month" />
              <Th label="Network" />
              <Th label="TC05 Settled Count" field="settled_txn_count" />
              <Th label="TC40 Fraud Count" field="tc40_count" />
              <Th label="TC15 CB Count" field="tc15_count" />
              <Th label="CE3.0 Deduct" field="ce30_count" />
              <Th label="VAMP Ratio" field="vamp_ratio" />
              <Th label="Fraud Ratio" field="fraud_ratio" />
              <Th label="CB Ratio" field="cb_ratio" />
              <Th label="Risk" field="risk" />
              <Th label="Source" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
          {rows.length === 0 && (
          <tr>
            <td colSpan={14} className="px-4 py-12 text-center text-slate-300">
              No VAMP records yet. Use "Import / Add Data" to get started.
            </td>
          </tr>
          )}
          {rows.map(r => {
          const rc = RISK_CONFIG[r.risk] || RISK_CONFIG.unknown;
          const RIcon = rc.icon;
          const isEditing = editing === r.id;

          return (
            <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? "bg-blue-50" : ""}`}>
              <td className="px-3 py-2.5 text-sm font-mono text-slate-600 whitespace-nowrap">{r.merchant_id}</td>
              <td className="px-3 py-2.5 text-sm font-medium text-slate-700 whitespace-nowrap">{r.merchant_alias || "—"}</td>
              <td className="px-3 py-2.5 text-sm text-slate-500 whitespace-nowrap font-mono">{r.period_month}</td>
              <td className="px-3 py-2.5 text-sm text-slate-500 whitespace-nowrap">{r.card_network}</td>
              <td className="px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                {isEditing ? numInput("settled_txn_count", "TC05 count") : (r.settled_txn_count?.toLocaleString() ?? <span className="text-slate-300">—</span>)}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                {isEditing ? numInput("tc40_count", "TC40 count") : (r.tc40_count?.toLocaleString() ?? <span className="text-slate-300">—</span>)}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                {isEditing ? numInput("tc15_count", "TC15 count") : (r.tc15_count?.toLocaleString() ?? <span className="text-slate-300">—</span>)}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                {isEditing ? numInput("ce30_count", "CE3.0") : (r.ce30_count?.toLocaleString() ?? <span className="text-slate-300">0</span>)}
              </td>
              <td className="px-3 py-2.5 text-sm font-bold whitespace-nowrap">
                {r.vamp_ratio !== null ? (
                  <span className={r.risk === "excessive" ? "text-red-600" : r.risk === "standard" ? "text-amber-600" : "text-emerald-600"}>
                    {(r.vamp_ratio * 100).toFixed(4)}%
                  </span>
                ) : <span className="text-slate-300">No TC05 data</span>}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                {r.fraud_ratio !== null ? `${(r.fraud_ratio * 100).toFixed(4)}%` : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                {r.cb_ratio !== null ? `${(r.cb_ratio * 100).toFixed(4)}%` : <span className="text-slate-300">—</span>}
              </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${rc.badge}`}>
                      <RIcon className="w-3 h-3" />{rc.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-slate-400 capitalize">{r.source || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={saveEdit} disabled={saving}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#0D50B8] text-white hover:bg-blue-700 disabled:opacity-50">
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D50B8] hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteRow(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}