import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ImagePlus } from "lucide-react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6996f53449fb2f4f399c2c75/6daefa08f_sign-no-tagline-bg-fff-1500x1500.png";

const integrations = [
{ name: "Fiserv", logo: "🏦", category: "Processor", desc: "Direct API & portal integration for chargeback data ingestion and submission." },
{ name: "Stripe", logo: "💳", category: "Processor", desc: "Webhook-based real-time dispute sync with full case enrichment." },
{ name: "Worldpay", logo: "🌐", category: "Processor", desc: "Automated inventory pull and response submission via Worldpay portal." },
{ name: "Adyen", logo: "🔷", category: "Processor", desc: "API-native integration for dispute management across all Adyen merchants." },
{ name: "PayPal", logo: "🅿️", category: "Processor", desc: "PayPal dispute ingestion and evidence submission via API." },
{ name: "American Express", logo: "🟦", category: "Card Network", desc: "Direct AmEx CBNOT and dispute management integration." },
{ name: "Visa / Mastercard", logo: "💠", category: "Card Network", desc: "Full reason code library, SLA rules, and network-specific dispute logic." },
{ name: "OpenAI / Claude", logo: "🤖", category: "AI Engine", desc: "Powers win prediction, cover letter generation, and anomaly detection." },
{ name: "REST API / Webhook", logo: "⚙️", category: "Custom", desc: "Connect any processor or CRM via configurable REST API or webhook endpoints." },
{ name: "CSV / Excel Import", logo: "📂", category: "Manual", desc: "Bulk import disputes from any source using flexible field mapping." },
{ name: "Email Notifications", logo: "✉️", category: "Alerts", desc: "Automated SLA alerts, win/loss notifications, and weekly digest emails." },
{ name: "Audit & Compliance", logo: "🔒", category: "Security", desc: "PCI-DSS-aligned audit logs, role access controls, and session tracking." }];


const featureSections = [
{
  id: "dashboard",
  badge: "Dashboard",
  title: "Real-time production overview",
  desc: "Get a bird's eye view of your entire dispute portfolio at a glance. Track live KPIs — total disputes, pending SLAs, win rates, and recovery amounts — across every project, processor, and card network.",
  bullets: [
  "Live dispute counts by status and priority",
  "SLA countdown and deadline alerts",
  "Win rate trend charts by month",
  "Per-analyst workload visibility",
  "Multi-project and multi-processor filtering"],

  color: "from-blue-600 to-indigo-700",
  screenColor: "bg-gradient-to-br from-[#0D50B8]/10 to-indigo-100",
  icon: "📊"
},
{
  id: "ai",
  badge: "AI Engine",
  title: "AI that wins cases for you",
  desc: "Our embedded AI analyses every dispute against its history, reason code, transaction signals, and evidence — then predicts your win probability, highlights gaps, and drafts a compelling cover letter in seconds.",
  bullets: [
  "Win probability score with confidence level",
  "Key factor analysis (fraud signals, AVS/CVV, 3DS)",
  "Evidence gap identification",
  "Auto-generated cover letters per reason code",
  "Continuous learning from outcomes"],

  color: "from-violet-600 to-purple-700",
  screenColor: "bg-gradient-to-br from-violet-50 to-purple-100",
  icon: "🤖"
},
{
  id: "inventory",
  badge: "Inventory",
  title: "Never miss a deadline again",
  desc: "Smart inventory ingestion from any processor — CSV, webhook, or API. Cases are automatically assigned, SLA-tracked, and converted to disputes with one click. Configure auto-convert rules for zero-touch workflows.",
  bullets: [
  "Multi-source import (CSV, API, webhook)",
  "Automatic SLA deadline calculation",
  "Rule-based auto-assignment to analysts",
  "One-click conversion to dispute workflow",
  "Expired case detection and alerts"],

  color: "from-emerald-600 to-teal-700",
  screenColor: "bg-gradient-to-br from-emerald-50 to-teal-100",
  icon: "📦"
},
{
  id: "chain",
  badge: "Case Chain Tracking",
  title: "Full dispute lifecycle in one view",
  desc: "Track every chargeback from First CB through Second CB, Pre-Arbitration, and Arbitration — all linked in a single chain. See net recovery, final outcome, and every decision point across the full lifecycle.",
  bullets: [
  "Linked dispute chains (1CB → 2CB → Pre-Arb → Arb)",
  "Net recovery calculation per chain",
  "Parent–child case inheritance (fields & evidence)",
  "Final status rollup across the chain",
  "Master Data export with full chain columns"],

  color: "from-orange-500 to-red-600",
  screenColor: "bg-gradient-to-br from-orange-50 to-red-100",
  icon: "🔗"
},
{
  id: "reports",
  badge: "Analytics",
  title: "Insights that drive strategy",
  desc: "Sophisticated reporting across every dimension of your dispute portfolio. Spot anomalies, benchmark processors, understand your weakest reason codes, and generate client-ready reports automatically.",
  bullets: [
  "Win rate by reason code, card type, processor",
  "Monthly trend analysis with z-score anomaly detection",
  "AI-generated strategic insights and recommendations",
  "Volume vs. recovery correlation charts",
  "Custom report builder with CSV export"],

  color: "from-cyan-600 to-blue-700",
  screenColor: "bg-gradient-to-br from-cyan-50 to-blue-100",
  icon: "📈"
},
{
  id: "automation",
  badge: "Automation",
  title: "Zero-touch dispute pipelines",
  desc: "Configure end-to-end automated pipelines that pull cases from processors, enrich data from CRMs, fetch evidence, generate cover letters, and submit — all without human intervention. Set SLA filters and fallback rules.",
  bullets: [
  "Scheduled or webhook-triggered pipeline runs",
  "Multi-source data enrichment (CRM, gateway, fraud tools)",
  "Automated evidence fetching via API or browser",
  "Auto cover letter generation and submission",
  "Failure handling with retry logic and notifications"],

  color: "from-pink-600 to-rose-700",
  screenColor: "bg-gradient-to-br from-pink-50 to-rose-100",
  icon: "⚡"
}];


const galleryScreenshots = [
{ label: "Production Dashboard", emoji: "📊", bg: "from-blue-900 to-indigo-900", desc: "Live KPIs, SLA countdown, win rate trends" },
{ label: "Dispute Detail View", emoji: "📋", bg: "from-slate-800 to-slate-900", desc: "Full case details, evidence, cover letter editor" },
{ label: "AI Win Prediction", emoji: "🤖", bg: "from-violet-900 to-purple-900", desc: "Probability score, factors, improvement actions" },
{ label: "Inventory Manager", emoji: "📦", bg: "from-emerald-900 to-teal-900", desc: "SLA tracking, bulk assignment, auto-convert" },
{ label: "Analytics Dashboard", emoji: "📈", bg: "from-cyan-900 to-blue-900", desc: "Win rates, anomaly detection, trend charts" },
{ label: "Master Data Export", emoji: "🗄️", bg: "from-orange-900 to-red-900", desc: "Full chain view, net recovery, CSV export" }];


export default function Features() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [galleryImages, setGalleryImages] = useState({});
  const [featureImages, setFeatureImages] = useState({});
  const [uploading, setUploading] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const activeSection = featureSections.find((s) => s.id === activeTab);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    base44.entities.GalleryImage.filter({ page: "features" }).then((records) => {
      const galleryMap = {};
      const featureMap = {};
      records.forEach((r) => {
        if (r.label.startsWith("feature_")) featureMap[r.label] = r.file_url;else
        galleryMap[r.label] = r.file_url;
      });
      setGalleryImages(galleryMap);
      setFeatureImages(featureMap);
    }).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const handleUpload = async (label, file) => {
    if (!file) return;
    setUploading(label);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existing = await base44.entities.GalleryImage.filter({ page: "features", label });
    if (existing && existing.length > 0) {
      await base44.entities.GalleryImage.update(existing[0].id, { file_url });
    } else {
      await base44.entities.GalleryImage.create({ label, page: "features", file_url });
    }
    if (label.startsWith("feature_")) {
      setFeatureImages((prev) => ({ ...prev, [label]: file_url }));
    } else {
      setGalleryImages((prev) => ({ ...prev, [label]: file_url }));
    }
    setUploading(null);
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .hero-gradient { background: linear-gradient(135deg, #0D50B8 0%, #1a3a8c 40%, #0a2260 100%); }
        .btn-primary { background: linear-gradient(135deg, #0D50B8, #1a6cf0); transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,80,184,0.35); }
        .tab-btn { transition: all 0.2s; }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl("Landing")} className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Shanora" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="text-[15px] font-bold leading-tight text-slate-800">Shanora</p>
              <p className="text-[9px] font-bold tracking-widest uppercase text-[#0D50B8]">Systems</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Landing")} className="text-sm font-medium text-slate-500 hover:text-[#0D50B8] transition-colors">← Back to Home</Link>
            <button onClick={handleLogin} className="btn-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-blue-200 text-sm font-bold tracking-widest uppercase mb-4">Platform Deep Dive</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight">
            Features, Integrations<br />& Dashboards
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Explore everything Shanora Systems offers — from AI-driven dispute analysis to zero-touch automation pipelines and enterprise integrations.
          </p>
        </div>
      </section>

      {/* Interactive Feature Explorer */}
      <section className="py-20 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Feature Explorer</p>
            <h2 className="text-4xl font-black text-slate-900">Click to explore each module</h2>
          </div>

          {/* Tab bar */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {featureSections.map((s) =>
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`tab-btn flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border ${
              activeTab === s.id ?
              "bg-[#0D50B8] text-white border-[#0D50B8] shadow-lg" :
              "bg-white text-slate-600 border-slate-200 hover:border-[#0D50B8] hover:text-[#0D50B8]"}`
              }>

                <span>{s.icon}</span> {s.badge}
              </button>
            )}
          </div>

          {/* Active feature panel */}
          {activeSection &&
          <div key={activeSection.id} className="fade-in grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl p-10 border border-slate-100 shadow-xl">
              <div>
                <span className={`inline-flex items-center gap-2 bg-gradient-to-r ${activeSection.color} text-white text-xs font-bold px-3 py-1.5 rounded-full mb-5`}>
                  {activeSection.icon} {activeSection.badge}
                </span>
                <h3 className="text-3xl font-black text-slate-900 mb-4">{activeSection.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed mb-6">{activeSection.desc}</p>
                <ul className="space-y-2.5">
                  {activeSection.bullets.map((b) =>
                <li key={b} className="flex items-start gap-3">
                      <span className="mt-1 w-4 h-4 rounded-full bg-[#0D50B8]/10 flex items-center justify-center flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D50B8]" />
                      </span>
                      <span className="text-slate-700 text-sm">{b}</span>
                    </li>
                )}
                </ul>
              </div>
              <div className={`relative rounded-2xl ${activeSection.screenColor} min-h-[320px] flex items-center justify-center overflow-hidden group`}>
                {featureImages[`feature_${activeSection.id}`] ?
              <img
                src={featureImages[`feature_${activeSection.id}`]}
                alt={activeSection.badge}
                className="w-full h-full object-cover rounded-2xl" /> :


              <div className="text-center p-8">
                    <div className="text-8xl mb-4">{activeSection.icon}</div>
                    <p className="text-slate-700 font-bold text-lg">{activeSection.badge}</p>
                    <p className="text-slate-500 text-sm mt-1">{activeSection.title}</p>
                  </div>
              }
                {isAdmin &&
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl z-10">
                    {uploading === `feature_${activeSection.id}` ?
                <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-white text-xs font-semibold">Uploading...</span>
                      </div> :

                <>
                        <ImagePlus className="w-7 h-7 text-white mb-1" />
                        <span className="text-white text-xs font-semibold">{featureImages[`feature_${activeSection.id}`] ? "Replace Image" : "Upload Image"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(`feature_${activeSection.id}`, e.target.files[0])} />
                      </>
                }
                  </label>
              }
              </div>
            </div>
          }
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Platform Gallery</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">See the platform in action</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">A preview of every key screen — from the production dashboard to the AI assistant.</p>
          </div>
          {isAdmin && (
            <p className="text-center text-xs text-slate-400 mb-6">🔒 Admin: hover over a card to upload a screenshot</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryScreenshots.map(s => (
              <div key={s.label} className="group rounded-2xl overflow-hidden border border-slate-100 shadow hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`relative bg-gradient-to-br ${s.bg} h-48 flex items-center justify-center overflow-hidden`}>
                  {galleryImages[s.label] ? (
                    <img src={galleryImages[s.label]} alt={s.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="text-center">
                      <div className="text-7xl mb-2">{s.emoji}</div>
                      <div className="w-32 h-1 bg-white/20 rounded-full mx-auto" />
                    </div>
                  )}
                  {isAdmin && (
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                      {uploading === s.label ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-white text-xs font-semibold">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <ImagePlus className="w-7 h-7 text-white mb-1" />
                          <span className="text-white text-xs font-semibold">{galleryImages[s.label] ? "Replace Image" : "Upload Image"}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(s.label, e.target.files[0])} />
                        </>
                      )}
                    </label>
                  )}
                </div>
                <div className="p-5 bg-white">
                  <p className="font-bold text-slate-900 text-sm">{s.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>




















































      {/* Integrations */}
      <section id="integrations" className="py-20 bg-[#F4F6FB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Integrations</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Connect everything</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Shanora Systems integrates with all major processors, card networks, AI providers, and custom data sources.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {integrations.map((i) =>
            <div key={i.name} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-[#0D50B8]/30 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{i.logo}</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{i.name}</p>
                    <span className="text-[10px] font-semibold text-[#0D50B8] bg-blue-50 px-2 py-0.5 rounded-full">{i.category}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{i.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Advanced Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Advanced Capabilities</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Built for enterprise teams</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
            { icon: "🧬", title: "Evidence DNA Matching", desc: "The AI maps each reason code to its optimal evidence requirements and flags exactly what's missing — before you submit." },
            { icon: "🏗️", title: "Multi-Project Architecture", desc: "Manage multiple clients or business units under one roof, each with isolated data, custom cover letters, and separate processor configs." },
            { icon: "📬", title: "Automated Cover Letters", desc: "Per-project, per-reason-code cover letter templates with dynamic placeholders populated automatically from case data." },
            { icon: "🎯", title: "Custom Field Mapping", desc: "Create unlimited custom fields, assign them to specific templates, and map them to your evidence types for fully tailored workflows." },
            { icon: "📡", title: "Webhook-Driven Inventory", desc: "Register processor webhooks to have new disputes land in your inventory in real time — no manual CSV uploads needed." },
            { icon: "🗺️", title: "Geographic & BIN Analysis", desc: "Analyse dispute patterns by country, state, BIN range, and card type to identify fraud hotspots and refine your strategy." },
            { icon: "👥", title: "Team Role Management", desc: "Granular role-based access: Super Admin, Admin, Manager, Analyst, and Viewer — each with tailored page-level permissions." },
            { icon: "🔄", title: "Dispute Chain Inheritance", desc: "When linking a 2CB or Pre-Arb case to its parent, all transaction data and uploaded evidence is inherited automatically." }].
            map((f) =>
            <div key={f.title} className="flex gap-5 p-6 rounded-2xl bg-[#F4F6FB] border border-slate-100 hover:border-[#0D50B8]/20 transition-all">
                <span className="text-4xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black text-white mb-4">Ready to see it live?</h2>
          <p className="text-white/70 text-lg mb-8">Sign in to your Shanora Systems account and experience every feature firsthand.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleLogin} className="btn-primary text-white font-bold px-10 py-4 rounded-2xl text-base">
              Sign In →
            </button>
            <Link to={createPageUrl("Landing")} className="text-white/70 font-semibold px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition-all text-sm">
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>);

}