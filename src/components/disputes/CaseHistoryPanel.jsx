import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, ChevronRight, Copy, CheckCircle2, Clock, AlertCircle, XCircle, Loader2 } from "lucide-react";

const CASE_TYPE_ORDER = ["First Chargeback", "Second Chargeback", "Pre-Arbitration", "Arbitration"];

const statusColors = {
  new: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  awaiting_decision: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  not_fought: "bg-slate-100 text-slate-600",
};

const statusIcons = {
  won: CheckCircle2,
  lost: XCircle,
  awaiting_decision: Clock,
  submitted: Clock,
  in_progress: AlertCircle,
  new: AlertCircle,
  not_fought: XCircle,
};

// Inherit fields from parent to child (skip case-specific fields)
const INHERIT_FIELDS = [
  "project_id", "business_unit", "sub_unit_name", "processor", "merchant_id",
  "merchant_alias", "dba_name", "card_network", "card_type", "card_bin_first6",
  "card_last4", "arn_number", "cardholder_name", "authorization_code",
  "authorization_date", "authorization_amount", "transaction_id", "transaction_date",
  "transaction_amount", "transaction_currency", "avs_match", "cvv_match",
  "three_d_secure", "billing_zip_code", "transaction_country", "transaction_state",
  "customer_id", "customer_type", "customer_name", "customer_email", "customer_phone",
  "customer_ip", "product_name", "product_type", "sale_type", "service_start_date",
  "service_end_date", "cover_letter_content", "reason_code", "reason_category",
  "chargeback_currency", "chargeback_amount_usd",
];

export default function CaseHistoryPanel({ dispute, onNavigate }) {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inheritLoading, setInheritLoading] = useState(false);
  const [inheritDone, setInheritDone] = useState(false);

  // Load the full dispute chain
  useEffect(() => {
    loadChain();
  }, [dispute.id]);

  const loadChain = async () => {
    setLoading(true);
    try {
      // Find the root dispute (oldest ancestor)
      let root = dispute;
      const visited = new Set();

      while (root.parent_dispute_id && !visited.has(root.id)) {
        visited.add(root.id);
        const parents = await base44.entities.Dispute.filter({ id: root.parent_dispute_id });
        if (parents.length > 0) root = parents[0];
        else break;
      }

      // Now collect all disputes sharing the same ARN/transaction chain from root
      const allRelated = [root];
      visited.clear();
      visited.add(root.id);

      // Find children recursively
      const findChildren = async (parentId) => {
        const children = await base44.entities.Dispute.filter({ parent_dispute_id: parentId });
        for (const child of children) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            allRelated.push(child);
            await findChildren(child.id);
          }
        }
      };
      await findChildren(root.id);

      // Sort by case type order
      allRelated.sort((a, b) => {
        const ai = CASE_TYPE_ORDER.indexOf(a.case_type) ?? 99;
        const bi = CASE_TYPE_ORDER.indexOf(b.case_type) ?? 99;
        return ai - bi;
      });

      setChain(allRelated);
    } catch (e) {
      setChain([dispute]);
    }
    setLoading(false);
  };

  // Search for disputes to link as parent
  const handleSearch = async () => {
    if (!linkSearch.trim()) return;
    setSearching(true);
    try {
      // Search by ARN first, then by case_id
      let results = [];
      if (linkSearch.length > 4) {
        const byArn = await base44.entities.Dispute.filter({ arn_number: linkSearch.trim() });
        const byCaseId = await base44.entities.Dispute.filter({ case_id: linkSearch.trim() });
        results = [...byArn, ...byCaseId].filter((d, i, arr) =>
          d.id !== dispute.id && arr.findIndex(x => x.id === d.id) === i
        );
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  // Link a parent dispute and inherit its data + evidence
  const handleLinkParent = async (parent) => {
    setLinking(true);
    setInheritDone(false);

    // 1. Set parent_dispute_id on current dispute
    const patch = { parent_dispute_id: parent.id };

    // Inherit fields from parent (only if current dispute doesn't have them)
    INHERIT_FIELDS.forEach(field => {
      if (!dispute[field] && parent[field]) {
        patch[field] = parent[field];
      }
    });

    await base44.entities.Dispute.update(dispute.id, patch);

    // 2. Copy evidence from parent to this dispute
    setInheritLoading(true);
    try {
      const parentEvidence = await base44.entities.DisputeEvidence.filter({ dispute_id: parent.id });
      const existingEvidence = await base44.entities.DisputeEvidence.filter({ dispute_id: dispute.id });
      const existingTypes = new Set(existingEvidence.map(e => e.evidence_type));

      for (const ev of parentEvidence) {
        if (!existingTypes.has(ev.evidence_type)) {
          await base44.entities.DisputeEvidence.create({
            dispute_id: dispute.id,
            evidence_type: ev.evidence_type,
            file_url: ev.file_url,
            file_name: ev.file_name,
            file_size_mb: ev.file_size_mb,
            notes: `Inherited from ${parent.case_id}`,
            status: "uploaded",
          });
        }
      }
    } catch {}

    setInheritLoading(false);
    setInheritDone(true);
    setLinking(false);
    setLinkSearch("");
    setSearchResults([]);
    await loadChain();

    // Reload the page to reflect inherited data
    window.location.reload();
  };

  const isCurrentDispute = (d) => d.id === dispute.id;
  const hasParent = !!dispute.parent_dispute_id;
  const isChildType = ["Second Chargeback", "Pre-Arbitration", "Arbitration"].includes(dispute.case_type);

  return (
    <Card className="border-indigo-100 bg-indigo-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600" />
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Case Chain</p>
          {loading && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
        </div>

        {/* Chain visualization */}
        {!loading && chain.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {chain.map((d, i) => {
              const Icon = statusIcons[d.status] || AlertCircle;
              const isCurrent = isCurrentDispute(d);
              return (
                <React.Fragment key={d.id}>
                  <button
                    onClick={() => !isCurrent && onNavigate && onNavigate(d)}
                    className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all ${
                      isCurrent
                        ? "border-indigo-400 bg-indigo-100 cursor-default"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3 h-3 ${d.status === "won" ? "text-emerald-600" : d.status === "lost" ? "text-red-500" : "text-slate-400"}`} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{d.case_type || "Unknown"}</span>
                      {isCurrent && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-semibold">Current</span>}
                    </div>
                    <span className="text-xs font-semibold text-[#0D50B8]">{d.case_id}</span>
                    <Badge className={`${statusColors[d.status] || "bg-slate-100"} border-0 text-[9px] px-1.5 py-0 mt-1`}>
                      {d.status?.replace("_", " ")}
                    </Badge>
                  </button>
                  {i < chain.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Link parent — shown for 2nd CB / Pre-Arb / Arbitration without a parent yet */}
        {isChildType && !hasParent && (
          <div className="border-t border-indigo-100 pt-3 space-y-2">
            <p className="text-xs text-slate-500">
              Link this <b>{dispute.case_type}</b> to its parent 1st Chargeback. Search by <b>ARN</b> or <b>Case ID</b>:
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Enter ARN or Case ID..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <Button size="sm" variant="outline" onClick={handleSearch} disabled={searching || !linkSearch.trim()}>
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                {searchResults.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0D50B8]">{r.case_id}</span>
                        <span className="text-[10px] text-slate-400">{r.case_type}</span>
                        <Badge className={`${statusColors[r.status] || ""} border-0 text-[9px] px-1.5 py-0`}>{r.status?.replace("_"," ")}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">ARN: {r.arn_number || "—"} · {r.reason_code || ""} · {r.chargeback_currency} {r.chargeback_amount?.toLocaleString()}</p>
                    </div>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      disabled={linking} onClick={() => handleLinkParent(r)}>
                      {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : "Link & Inherit"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {searchResults.length === 0 && linkSearch && !searching && (
              <p className="text-xs text-slate-400">No matching disputes found. Try the exact ARN or Case ID.</p>
            )}
          </div>
        )}

        {/* Inherit status message */}
        {inheritDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Linked successfully! Case details and evidence inherited from parent dispute.
          </div>
        )}
        {inheritLoading && (
          <div className="flex items-center gap-2 text-xs text-indigo-600">
            <Loader2 className="w-3 h-3 animate-spin" /> Copying evidence from parent dispute...
          </div>
        )}

        {/* Already linked message */}
        {isChildType && hasParent && chain.length > 1 && (
          <p className="text-[11px] text-slate-400">
            Evidence and cover letter inherited from parent case. Navigate to any case in the chain above to view details.
          </p>
        )}
      </CardContent>
    </Card>
  );
}