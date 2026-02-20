import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Webhook, Upload, Info } from "lucide-react";

const PROCESSORS = ["Fiserv", "American Express", "Visa", "Mastercard", "Stripe", "PayPal", "Adyen", "Worldpay", "Chase Paymentech", "Braintree", "Other"];
const FREQUENCIES = ["Every 1 hour", "Every 6 hours", "Every 12 hours", "Daily", "Weekly"];
const TIMES = ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"];

const F = ({ label, children, hint }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium text-slate-600">{label}</Label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const SectionCard = ({ icon: Icon, title, color, children }) => (
  <Card className="border-slate-100">
    <CardContent className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      {children}
    </CardContent>
  </Card>
);

export default function ProjectInventoryAutomationTab({ config, onChange }) {
  const cfg = config || {};
  const set = (k, v) => onChange({ ...cfg, [k]: v });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Configure how inventory chargebacks are loaded for this project. You can enable one or more ingestion methods. All incoming items will be automatically tagged to this project.</span>
      </div>

      {/* ── Scheduled Pull ───────────────────────────────────── */}
      <SectionCard icon={Clock} title="Scheduled Pull (Processor Portal)" color="bg-blue-100 text-blue-600">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={!!cfg.scheduled_pull_enabled}
            onCheckedChange={v => set("scheduled_pull_enabled", v)}
          />
          <span className="text-sm text-slate-700 font-medium">Enable Scheduled Pull</span>
          {cfg.scheduled_pull_enabled && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>}
        </div>

        {cfg.scheduled_pull_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
            <F label="Source Processor">
              <Select value={cfg.pull_processor || ""} onValueChange={v => set("pull_processor", v)}>
                <SelectTrigger><SelectValue placeholder="Select processor..." /></SelectTrigger>
                <SelectContent>{PROCESSORS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Frequency">
              <Select value={cfg.pull_frequency || ""} onValueChange={v => set("pull_frequency", v)}>
                <SelectTrigger><SelectValue placeholder="Select frequency..." /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            {(cfg.pull_frequency === "Daily" || cfg.pull_frequency === "Weekly") && (
              <F label="Pull Time (UTC)">
                <Select value={cfg.pull_time || ""} onValueChange={v => set("pull_time", v)}>
                  <SelectTrigger><SelectValue placeholder="Select time..." /></SelectTrigger>
                  <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </F>
            )}
            <F label="Portal URL" hint="The processor portal URL to pull data from">
              <Input value={cfg.pull_portal_url || ""} onChange={e => set("pull_portal_url", e.target.value)} placeholder="https://portal.processor.com/api/chargebacks" />
            </F>
            <F label="API Key / Token" hint="Authentication token for the processor API">
              <Input type="password" value={cfg.pull_api_key || ""} onChange={e => set("pull_api_key", e.target.value)} placeholder="••••••••••••" />
            </F>
            <F label="Lookback Days" hint="How many days back to pull on each run">
              <Input type="number" value={cfg.pull_lookback_days || ""} onChange={e => set("pull_lookback_days", e.target.value)} placeholder="e.g. 1" />
            </F>
            <F label="Card Networks" hint="Filter by card network (leave blank for all)">
              <div className="flex flex-wrap gap-2 mt-1">
                {["Visa","Mastercard","American Express","Discover","Other"].map(n => (
                  <label key={n} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={(cfg.pull_card_networks || []).includes(n)}
                      onCheckedChange={v => {
                        const arr = cfg.pull_card_networks || [];
                        set("pull_card_networks", v ? [...arr, n] : arr.filter(x => x !== n));
                      }}
                    />
                    <span className="text-xs text-slate-700">{n}</span>
                  </label>
                ))}
              </div>
            </F>
          </div>
        )}
      </SectionCard>

      {/* ── Webhook Receiver ─────────────────────────────────── */}
      <SectionCard icon={Webhook} title="Webhook / Event-Driven (Processor Pushes)" color="bg-purple-100 text-purple-600">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={!!cfg.webhook_enabled}
            onCheckedChange={v => set("webhook_enabled", v)}
          />
          <span className="text-sm text-slate-700 font-medium">Enable Webhook Receiver</span>
          {cfg.webhook_enabled && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>}
        </div>

        {cfg.webhook_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
            <F label="Webhook Source Processor">
              <Select value={cfg.webhook_processor || ""} onValueChange={v => set("webhook_processor", v)}>
                <SelectTrigger><SelectValue placeholder="Select processor..." /></SelectTrigger>
                <SelectContent>{PROCESSORS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Webhook Secret / Signing Key" hint="Used to validate incoming webhook payloads">
              <Input type="password" value={cfg.webhook_secret || ""} onChange={e => set("webhook_secret", e.target.value)} placeholder="••••••••••••" />
            </F>
            <div className="sm:col-span-2">
              <F label="Your Webhook Endpoint (register this in your processor portal)" hint="Copy this URL and register it in your processor's webhook configuration">
                <div className="flex items-center gap-2">
                  <Input readOnly value={`https://api.base44.com/functions/inventoryWebhook?project_id=${cfg._project_id || "<project_id>"}`} className="bg-slate-50 text-slate-500 text-xs" />
                  <button
                    className="text-xs text-[#0D50B8] whitespace-nowrap hover:underline"
                    onClick={() => navigator.clipboard.writeText(`https://api.base44.com/functions/inventoryWebhook?project_id=${cfg._project_id || ""}`)}
                  >Copy</button>
                </div>
              </F>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Manual / Bulk Upload ─────────────────────────────── */}
      <SectionCard icon={Upload} title="Manual & Bulk CSV Upload" color="bg-amber-100 text-amber-600">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={cfg.manual_upload_enabled !== false}
            onCheckedChange={v => set("manual_upload_enabled", v)}
          />
          <span className="text-sm text-slate-700 font-medium">Allow Manual & CSV Upload for this project</span>
          {cfg.manual_upload_enabled !== false && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Enabled</Badge>}
        </div>
        {cfg.manual_upload_enabled !== false && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
            <F label="Default Source Tag" hint="Tag applied to manually uploaded items">
              <Select value={cfg.manual_source_tag || "Manual"} onValueChange={v => set("manual_source_tag", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Manual","Fiserv","PayPal","Stripe","American Express","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Auto-Assign Uploaded Items" hint="Automatically mark uploaded items as assigned to this project">
              <div className="flex items-center gap-2 h-9">
                <Checkbox
                  checked={!!cfg.manual_auto_assign}
                  onCheckedChange={v => set("manual_auto_assign", v)}
                />
                <span className="text-sm text-slate-600">Auto-assign on upload</span>
              </div>
            </F>
          </div>
        )}
      </SectionCard>

      {/* ── Auto-Convert Rules ───────────────────────────────── */}
      <SectionCard icon={Zap} title="Auto-Convert Rules" color="bg-green-100 text-green-600">
        <p className="text-xs text-slate-400 mb-3">Define conditions under which inventory items are automatically converted to disputes without manual review.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="Auto-Convert on Receipt">
            <div className="flex items-center gap-2 h-9">
              <Checkbox
                checked={!!cfg.auto_convert_enabled}
                onCheckedChange={v => set("auto_convert_enabled", v)}
              />
              <span className="text-sm text-slate-600">Auto-convert all incoming items</span>
            </div>
          </F>
          {cfg.auto_convert_enabled && (
            <>
              <F label="Auto-Assign To (Analyst Email)" hint="Leave blank to leave unassigned">
                <Input value={cfg.auto_convert_assign_to || ""} onChange={e => set("auto_convert_assign_to", e.target.value)} placeholder="analyst@example.com" />
              </F>
              <F label="Only Auto-Convert if Due Date within (days)" hint="Urgent items only">
                <Input type="number" value={cfg.auto_convert_due_within_days || ""} onChange={e => set("auto_convert_due_within_days", e.target.value)} placeholder="e.g. 5" />
              </F>
              <F label="Only for Card Networks">
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Visa","Mastercard","American Express","Discover","Other"].map(n => (
                    <label key={n} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={(cfg.auto_convert_networks || []).includes(n)}
                        onCheckedChange={v => {
                          const arr = cfg.auto_convert_networks || [];
                          set("auto_convert_networks", v ? [...arr, n] : arr.filter(x => x !== n));
                        }}
                      />
                      <span className="text-xs text-slate-700">{n}</span>
                    </label>
                  ))}
                </div>
              </F>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}