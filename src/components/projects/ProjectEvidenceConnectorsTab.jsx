import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Eye, EyeOff, Globe, Code2, Camera, Info } from "lucide-react";

const PORTAL_TYPES = [
  "Processor Portal",
  "CRM",
  "Order Management System",
  "Payment Gateway",
  "Fraud Tool",
  "Shipping / Logistics",
  "Customer Support",
  "Other",
];

const AUTH_TYPES = ["API Key (Header)", "Bearer Token", "Basic Auth", "OAuth2", "No Auth"];

const F = ({ label, children, hint }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
);

// ── API Connector Form ─────────────────────────────────────────────────────────
function ApiConnectorForm({ connector, onChange }) {
  const set = (k, v) => onChange({ ...connector, [k]: v });
  const setHeader = (i, k, v) => {
    const headers = [...(connector.api_headers || [])];
    headers[i] = { ...headers[i], [k]: v };
    onChange({ ...connector, api_headers: headers });
  };
  const addHeader = () => onChange({ ...connector, api_headers: [...(connector.api_headers || []), { key: "", value: "" }] });
  const removeHeader = (i) => onChange({ ...connector, api_headers: (connector.api_headers || []).filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="API Base URL" hint="e.g. https://api.processor.com/v1">
          <Input value={connector.api_base_url || ""} onChange={e => set("api_base_url", e.target.value)} placeholder="https://..." />
        </F>
        <F label="Evidence Fetch Endpoint" hint="Path appended to base URL, e.g. /disputes/{case_id}/evidence">
          <Input value={connector.api_endpoint || ""} onChange={e => set("api_endpoint", e.target.value)} placeholder="/disputes/{case_id}/documents" />
        </F>
        <F label="Auth Type">
          <Select value={connector.api_auth_type || ""} onValueChange={v => set("api_auth_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{AUTH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="API Key / Token" hint="Will be stored securely">
          <Input value={connector.api_key || ""} onChange={e => set("api_key", e.target.value)} placeholder="sk_..." type="password" />
        </F>
      </div>

      {/* Dynamic Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom Headers</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addHeader}><Plus className="w-3 h-3 mr-1" />Add Header</Button>
        </div>
        {(connector.api_headers || []).map((h, i) => (
          <div key={i} className="flex gap-2 items-center mb-2">
            <Input className="text-xs" placeholder="Header name" value={h.key} onChange={e => setHeader(i, "key", e.target.value)} />
            <Input className="text-xs" placeholder="Value" value={h.value} onChange={e => setHeader(i, "value", e.target.value)} />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => removeHeader(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Transaction ID Field Mapping" hint="Field name used to identify transaction in the API">
          <Input value={connector.api_transaction_field || ""} onChange={e => set("api_transaction_field", e.target.value)} placeholder="e.g. transaction_id" />
        </F>
        <F label="Case ID Field Mapping" hint="Field name used to identify the dispute case">
          <Input value={connector.api_case_field || ""} onChange={e => set("api_case_field", e.target.value)} placeholder="e.g. dispute_id" />
        </F>
      </div>

      <F label="Response Mapping / Notes" hint="Describe how to extract evidence from the API response (used for automation guidance)">
        <Textarea
          value={connector.api_response_notes || ""}
          onChange={e => set("api_response_notes", e.target.value)}
          placeholder="e.g. Evidence files are under response.data.documents[].url — fetch each as an attachment."
          className="min-h-[80px] text-xs"
        />
      </F>
    </div>
  );
}

// ── Browser/Screenshot Connector Form ─────────────────────────────────────────
function BrowserConnectorForm({ connector, onChange }) {
  const [showPwd, setShowPwd] = useState(false);
  const set = (k, v) => onChange({ ...connector, [k]: v });

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Browser-based login will use a headless browser to log in and capture screenshots from the portal. Provide login credentials and navigation instructions below.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Portal Login URL">
          <Input value={connector.browser_login_url || ""} onChange={e => set("browser_login_url", e.target.value)} placeholder="https://portal.processor.com/login" />
        </F>
        <F label="Evidence Page URL Pattern" hint="Use {case_id} as a placeholder">
          <Input value={connector.browser_evidence_url || ""} onChange={e => set("browser_evidence_url", e.target.value)} placeholder="https://portal.com/cases/{case_id}/docs" />
        </F>
        <F label="Username / Email">
          <Input value={connector.browser_username || ""} onChange={e => set("browser_username", e.target.value)} />
        </F>
        <F label="Password">
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              value={connector.browser_password || ""}
              onChange={e => set("browser_password", e.target.value)}
              className="pr-9"
            />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPwd(p => !p)}>
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </F>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <F label="Username Field Selector" hint="CSS selector for the username input on the login page">
          <Input value={connector.browser_username_selector || ""} onChange={e => set("browser_username_selector", e.target.value)} placeholder='e.g. input[name="email"]' />
        </F>
        <F label="Password Field Selector" hint="CSS selector for the password input">
          <Input value={connector.browser_password_selector || ""} onChange={e => set("browser_password_selector", e.target.value)} placeholder='e.g. input[name="password"]' />
        </F>
        <F label="Submit Button Selector">
          <Input value={connector.browser_submit_selector || ""} onChange={e => set("browser_submit_selector", e.target.value)} placeholder='e.g. button[type="submit"]' />
        </F>
        <F label="Evidence Section Selector" hint="CSS selector of the region to screenshot after login">
          <Input value={connector.browser_evidence_selector || ""} onChange={e => set("browser_evidence_selector", e.target.value)} placeholder='e.g. #evidence-panel' />
        </F>
      </div>

      <F label="Navigation / Interaction Notes" hint="Step-by-step notes for the automation agent on how to navigate to the evidence">
        <Textarea
          value={connector.browser_nav_notes || ""}
          onChange={e => set("browser_nav_notes", e.target.value)}
          placeholder={`e.g.\n1. Login at /login\n2. Go to Cases > search by case_id\n3. Click 'Evidence' tab\n4. Screenshot the full evidence list\n5. Download each PDF attachment`}
          className="min-h-[100px] text-xs"
        />
      </F>

      <F label="Screenshot Scope">
        <Select value={connector.browser_screenshot_scope || "element"} onValueChange={v => set("browser_screenshot_scope", v)}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="element">Specific Element (selector above)</SelectItem>
            <SelectItem value="full_page">Full Page</SelectItem>
            <SelectItem value="viewport">Visible Viewport Only</SelectItem>
          </SelectContent>
        </Select>
      </F>
    </div>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────────
export default function ProjectEvidenceConnectorsTab({ connectors = [], onChange }) {
  const add = () => onChange([...connectors, {
    connector_label: "",
    portal_type: "",
    fetch_method: "api",
    enabled: true,
  }]);
  const remove = (i) => onChange(connectors.filter((_, idx) => idx !== i));
  const update = (i, val) => onChange(connectors.map((c, idx) => idx === i ? val : c));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidence Source Connectors</p>
          <p className="text-xs text-slate-400 mt-0.5">Configure portals from which evidence will be automatically fetched for disputes</p>
        </div>
        <Button size="sm" variant="outline" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add Connector</Button>
      </div>

      {connectors.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm space-y-2">
          <Camera className="w-8 h-8 mx-auto text-slate-300" />
          <p>No evidence connectors configured yet.</p>
          <p className="text-xs">Add a connector to enable automated evidence fetching via API or browser screenshot.</p>
        </div>
      )}

      {connectors.map((c, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <F label="Connector Label">
                  <Input value={c.connector_label || ""} onChange={e => update(i, { ...c, connector_label: e.target.value })} placeholder="e.g. Fiserv Evidence Portal" />
                </F>
                <F label="Portal Type">
                  <Select value={c.portal_type || ""} onValueChange={v => update(i, { ...c, portal_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{PORTAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Status">
                  <Select value={c.enabled ? "enabled" : "disabled"} onValueChange={v => update(i, { ...c, enabled: v === "enabled" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 self-end mb-1" onClick={() => remove(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Fetch Method Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => update(i, { ...c, fetch_method: "api" })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${c.fetch_method === "api" ? "bg-[#0D50B8] text-white border-[#0D50B8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                <Code2 className="w-3.5 h-3.5" /> API / Webhook
              </button>
              <button
                onClick={() => update(i, { ...c, fetch_method: "browser" })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${c.fetch_method === "browser" ? "bg-[#0D50B8] text-white border-[#0D50B8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                <Globe className="w-3.5 h-3.5" /> Browser / Screenshot
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              {c.fetch_method === "api"
                ? <ApiConnectorForm connector={c} onChange={val => update(i, val)} />
                : <BrowserConnectorForm connector={c} onChange={val => update(i, val)} />
              }
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}