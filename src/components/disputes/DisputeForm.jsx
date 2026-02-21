import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Save, Loader2 } from "lucide-react";

const CURRENCIES = ["USD","AUD","EUR","GBP","CAD","NZD","SGD","HKD","CHF","JPY","INR","MXN","BRL","ZAR","AED"];

const SECTION = ({ title, children }) => (
  <Card className="border-slate-100">
    <CardHeader className="pb-3 pt-4 px-5">
      <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </CardContent>
  </Card>
);

const F = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

export default function DisputeForm({ dispute, projects, onSave, onCancel }) {
  const [form, setForm] = useState(dispute || {
    case_id: "", project_id: "", status: "new", case_type: "", fought_decision: "", not_fought_reason: "", not_fought_notes: "",
    processor: "", merchant_id: "", merchant_alias: "", dba_name: "",
    card_network: "", card_bin_first6: "", card_last4: "", card_type: "",
    reason_code: "", reason_category: "",
    arn_number: "", cardholder_name: "", authorization_type: "",
    authorization_date: "", authorization_amount: "", authorization_code: "",
    chargeback_date: "", chargeback_amount: "", chargeback_currency: "",
    sla_deadline: "", transaction_id: "", transaction_date: "",
    transaction_amount: "", transaction_currency: "",
    avs_match: "", cvv_match: "", three_d_secure: "",
    billing_zip_code: "", transaction_country: "", transaction_state: "",
    customer_id: "", customer_type: "", product_name: "", product_type: "",
    customer_name: "", customer_email: "", customer_phone: "", customer_ip: "",
    service_start_date: "", service_end_date: "", cancellation_date: "",
    customer_contact_date: "", assigned_to: "", notes: "", missing_evidence: "No",
  });
  const [reasonCodes, setReasonCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [convertingFx, setConvertingFx] = useState(false);
  const fxTimer = useRef(null);

  useEffect(() => {
    base44.entities.ReasonCode.list().then(setReasonCodes).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill project fields when project selected
  const handleProjectChange = (pid) => {
    const p = projects.find(x => x.id === pid);
    if (p) {
      const firstUnit = p.sub_units?.[0];
      setForm(f => ({
        ...f,
        project_id: pid,
        business_unit: p.name,
        sub_unit_name: firstUnit?.sub_unit_name || f.sub_unit_name,
        processor: firstUnit?.processor || f.processor,
        merchant_id: firstUnit?.merchant_id || f.merchant_id,
        merchant_alias: firstUnit?.mid_alias || f.merchant_alias,
        dba_name: firstUnit?.dba_name || f.dba_name,
        dispute_currency: firstUnit?.currency || f.dispute_currency,
        transaction_currency: firstUnit?.currency || f.transaction_currency,
      }));
    } else {
      set("project_id", pid);
    }
  };

  const handleReasonCodeChange = (code) => {
    const rc = reasonCodes.find(r => r.reason_code === code);
    setForm(f => ({ ...f, reason_code: code, reason_category: rc?.cb_reason || f.reason_category }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (dispute?.id) await base44.entities.Dispute.update(dispute.id, form);
    else await base44.entities.Dispute.create(form);
    setSaving(false);
    onSave();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{dispute ? "Edit Dispute" : "New Dispute"}</h1>
          <p className="text-slate-500 text-xs">{dispute ? `Case: ${dispute.case_id}` : "Create a new chargeback dispute"}</p>
        </div>
        <div className="ml-auto">
          <Button className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Dispute"}
          </Button>
        </div>
      </div>

      <SECTION title="Case Information">
        <F label="Case ID *"><Input value={form.case_id} onChange={e => set("case_id", e.target.value)} placeholder="Case ID" /></F>
        <F label="Project *">
          <Select value={form.project_id} onValueChange={handleProjectChange}>
            <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Status">
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Case Type">
          <Select value={form.case_type} onValueChange={v => set("case_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {["First Chargeback","Second Chargeback","Pre-Arbitration","Arbitration","Retrieval Request","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Assigned To"><Input value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} placeholder="Analyst email" /></F>
        <F label="SLA Deadline"><Input type="date" value={form.sla_deadline} onChange={e => set("sla_deadline", e.target.value)} /></F>
        <F label="Missing Evidence">
          <Select value={form.missing_evidence} onValueChange={v => set("missing_evidence", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
          </Select>
        </F>
      </SECTION>

      <SECTION title="Chargeback Details (from Processor Portal)">
        <F label="Chargeback Date"><Input type="date" value={form.chargeback_date} onChange={e => set("chargeback_date", e.target.value)} /></F>
        <F label="Chargeback Amount"><Input type="number" value={form.chargeback_amount} onChange={e => set("chargeback_amount", e.target.value)} placeholder="0.00" /></F>
        <F label="Chargeback Currency"><Input value={form.chargeback_currency} onChange={e => set("chargeback_currency", e.target.value)} placeholder="USD" /></F>
        <F label="Reason Code">
          <Select value={form.reason_code} onValueChange={handleReasonCodeChange}>
            <SelectTrigger><SelectValue placeholder="Select reason code..." /></SelectTrigger>
            <SelectContent>
              {reasonCodes.map(r => <SelectItem key={r.id} value={r.reason_code}>{r.reason_code} — {r.reason_code_description}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Reason Category"><Input value={form.reason_category} onChange={e => set("reason_category", e.target.value)} placeholder="Auto-filled from reason code" /></F>
        <F label="ARN (Acquirer Reference Number)"><Input value={form.arn_number} onChange={e => set("arn_number", e.target.value)} /></F>
      </SECTION>

      <SECTION title="Card & Authorization">
        <F label="Card Network">
          <Select value={form.card_network} onValueChange={v => set("card_network", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{["Visa","Mastercard","American Express","Discover","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Card Type (Funding)">
          <Select value={form.card_type} onValueChange={v => set("card_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{["Credit","Debit","Prepaid","Corporate","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Card BIN (First 6 digits)"><Input value={form.card_bin_first6} onChange={e => set("card_bin_first6", e.target.value)} maxLength={6} placeholder="411111" /></F>
        <F label="Card Last 4 digits"><Input value={form.card_last4} onChange={e => set("card_last4", e.target.value)} maxLength={4} placeholder="1234" /></F>
        <F label="Cardholder Name"><Input value={form.cardholder_name} onChange={e => set("cardholder_name", e.target.value)} /></F>
        <F label="Auth Code (Approval Code)"><Input value={form.authorization_code} onChange={e => set("authorization_code", e.target.value)} /></F>
        <F label="Auth Date"><Input type="date" value={form.authorization_date} onChange={e => set("authorization_date", e.target.value)} /></F>
        <F label="Auth Amount"><Input type="number" value={form.authorization_amount} onChange={e => set("authorization_amount", e.target.value)} /></F>
        <F label="AVS Result"><Input value={form.avs_match} onChange={e => set("avs_match", e.target.value)} placeholder="Y / N / P" /></F>
        <F label="CVV Result"><Input value={form.cvv_match} onChange={e => set("cvv_match", e.target.value)} placeholder="M / N / P" /></F>
        <F label="3D Secure (3DS)"><Input value={form.three_d_secure} onChange={e => set("three_d_secure", e.target.value)} placeholder="Y / N / A" /></F>
      </SECTION>

      <SECTION title="Original Transaction Details">
        <F label="Transaction ID"><Input value={form.transaction_id} onChange={e => set("transaction_id", e.target.value)} /></F>
        <F label="Transaction Date"><Input type="date" value={form.transaction_date} onChange={e => set("transaction_date", e.target.value)} /></F>
        <F label="Transaction Amount"><Input type="number" value={form.transaction_amount} onChange={e => set("transaction_amount", e.target.value)} /></F>
        <F label="Transaction Currency"><Input value={form.transaction_currency} onChange={e => set("transaction_currency", e.target.value)} /></F>
        <F label="Transaction Country"><Input value={form.transaction_country} onChange={e => set("transaction_country", e.target.value)} /></F>
        <F label="Transaction State"><Input value={form.transaction_state} onChange={e => set("transaction_state", e.target.value)} /></F>
        <F label="Billing Zip Code"><Input value={form.billing_zip_code} onChange={e => set("billing_zip_code", e.target.value)} /></F>
      </SECTION>

      <SECTION title="Customer & Order">
        <F label="Customer Name"><Input value={form.customer_name} onChange={e => set("customer_name", e.target.value)} /></F>
        <F label="Customer Email"><Input value={form.customer_email} onChange={e => set("customer_email", e.target.value)} /></F>
        <F label="Customer Phone"><Input value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} /></F>
        <F label="Customer IP"><Input value={form.customer_ip} onChange={e => set("customer_ip", e.target.value)} /></F>
        <F label="Customer ID"><Input value={form.customer_id} onChange={e => set("customer_id", e.target.value)} /></F>
        <F label="Customer Type"><Input value={form.customer_type} onChange={e => set("customer_type", e.target.value)} /></F>
        <F label="Product Name"><Input value={form.product_name} onChange={e => set("product_name", e.target.value)} /></F>
        <F label="Product Type">
          <Select value={form.product_type} onValueChange={v => set("product_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{["Physical Goods","Digital Goods","Services","Subscription","Other"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Service Start Date"><Input type="date" value={form.service_start_date} onChange={e => set("service_start_date", e.target.value)} /></F>
        <F label="Service End Date"><Input type="date" value={form.service_end_date} onChange={e => set("service_end_date", e.target.value)} /></F>
        <F label="Cancellation Date"><Input type="date" value={form.cancellation_date} onChange={e => set("cancellation_date", e.target.value)} /></F>
        <F label="Customer Contact Date"><Input type="date" value={form.customer_contact_date} onChange={e => set("customer_contact_date", e.target.value)} /></F>
      </SECTION>

      <Card className="border-slate-100">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." className="min-h-[80px]" />
        </CardContent>
      </Card>
    </div>
  );
}