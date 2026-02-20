import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const CODE = `POST /api/inventory
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>

{
  "case_id": "CB-2024-001",
  "project_id": "<project_id>",
  "case_type": "First Chargeback",
  "reason_code": "4853",
  "reason_category": "Not As Described",
  "arn_number": "123456789",
  "transaction_date": "2024-01-10",
  "transaction_amount": 250.00,
  "currency": "USD",
  "chargeback_date": "2024-01-20",
  "chargeback_amount": 250.00,
  "processor": "Fiserv",
  "card_network": "Visa",
  "card_type": "Credit",
  "bin_first6": "411111",
  "bin_last4": "1234",
  "due_date": "2024-02-05",
  "sub_unit_name": "Main Store",
  "merchant_id": "MID001",
  "source": "API"
}`;

export default function ApiInfoModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API & Automation Integration</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm">

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-blue-800">How inventory can be loaded automatically:</p>
            <ul className="space-y-1 text-blue-700 text-xs list-disc ml-4">
              <li><strong>Manual CSV Upload</strong> — Use the "Bulk Upload" button to import a CSV file.</li>
              <li><strong>REST API</strong> — Push chargebacks directly from your processor portal or middleware using the API endpoint below.</li>
              <li><strong>Scheduled Automation</strong> — Set up a scheduled task to pull chargebacks from your processor portal on a regular basis (e.g., daily at 6 AM).</li>
              <li><strong>Webhook / Event-driven</strong> — Receive real-time chargeback notifications from processors and push them to this system.</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sample API Request</p>
              <button onClick={doCopy} className="flex items-center gap-1 text-xs text-[#0D50B8] hover:underline">
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre leading-relaxed">{CODE}</pre>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Supported Processors / Sources</p>
            <div className="flex flex-wrap gap-2">
              {["Stripe","PayPal","Fiserv","American Express","Worldpay","Chase Paymentech","Adyen","Braintree","Other"].map(p => (
                <Badge key={p} className="bg-slate-100 text-slate-700 border-0 text-xs">{p}</Badge>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Note:</strong> The <code className="bg-amber-100 px-1 rounded">project_id</code> field must match an active project in the system. Items with an unrecognized project_id will still be loaded with status <em>received</em> and can be assigned later.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}