import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VampStripeImport({ onSaved }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.Project.list().then(data => {
      // Only show projects with a Stripe key configured
      setProjects(data.filter(p => p.stripe_integration?.stripe_secret_key));
    }).catch(() => {});
  }, []);

  const project = projects.find(p => p.id === selectedProject);
  const stripeKey = project?.stripe_integration?.stripe_secret_key;
  const defaultNetwork = project?.stripe_integration?.default_card_network || "Visa";

  const fetchFromStripe = async () => {
    if (!stripeKey || !periodMonth) return;
    setFetching(true);
    setError("");
    setPreview(null);
    try {
      const resp = await base44.functions.invoke('fetchStripeVampData', {
        project_id: selectedProject,
        period_month: periodMonth,
        stripe_secret_key: stripeKey,
      });
      if (resp.data?.success) {
        setPreview({ ...resp.data.data, card_network: defaultNetwork });
      } else {
        setError(resp.data?.error || "Failed to fetch from Stripe");
      }
    } catch (e) {
      setError(e.message || "Network error");
    }
    setFetching(false);
  };

  const saveRecord = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await base44.entities.VampTransaction.create(preview);
      setResult({ success: true });
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  if (result?.success) {
    return (
      <div className="text-center py-10 space-y-3">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <p className="font-semibold text-slate-700">VAMP record saved successfully!</p>
        <Button size="sm" onClick={onSaved} className="bg-[#0D50B8] hover:bg-blue-700">Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 mt-2">
      {projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          No projects have a Stripe API key configured. Go to <strong>Projects → Edit → Stripe Integration</strong> to add one.
        </div>
      )}

      {projects.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Project</label>
              <Select value={selectedProject || ""} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Reporting Month</label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="bg-[#635BFF] hover:bg-[#4f47e6] w-full gap-2"
            onClick={fetchFromStripe}
            disabled={fetching || !selectedProject || !periodMonth}
          >
            {fetching
              ? <><Loader2 className="w-4 h-4 animate-spin" />Fetching from Stripe…</>
              : <><Zap className="w-4 h-4" />Fetch TC05 & TC15 from Stripe</>
            }
          </Button>
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {preview && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Preview — fetched data</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              ["Merchant ID", preview.merchant_id],
              ["Merchant Name", preview.merchant_alias],
              ["Period", preview.period_month],
              ["Card Network", preview.card_network],
              ["TC05 Settled Count", preview.settled_txn_count?.toLocaleString()],
              ["TC05 Amount (USD)", `$${preview.settled_txn_amount_usd?.toLocaleString()}`],
              ["TC15 Dispute Count", preview.tc15_count?.toLocaleString()],
              ["TC15 Amount (USD)", `$${preview.tc15_amount_usd?.toLocaleString()}`],
              ["TC40 Fraud Count", "0 (not available via Stripe API)"],
              ["CE3.0 Count", "0"],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl p-2.5 border border-slate-100">
                <p className="text-slate-400">{label}</p>
                <p className="font-semibold text-slate-700 mt-0.5 break-all">{value ?? "—"}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800">
            TC40 (fraud reports) are not available via Stripe API. You can manually update this field after saving.
          </div>
          <Button onClick={saveRecord} disabled={saving} className="bg-[#0D50B8] hover:bg-blue-700 w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save to VAMP Database"}
          </Button>
        </div>
      )}
    </div>
  );
}