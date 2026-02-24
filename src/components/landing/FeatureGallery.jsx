import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

const GALLERY_ITEMS = [
  { label: "Production Dashboard", sub: "Live KPIs, win rates, SLA alerts", bg: "from-blue-700 to-indigo-800", emoji: "📊",
    prompt: "A modern dark-themed web application dashboard screenshot showing chargeback dispute management KPI cards with win rate 85%, total disputes 1240, recovered $2.1M. Blue and indigo color scheme. Line chart of monthly win rate trends. Clean professional SaaS UI with sidebar navigation. Photorealistic UI screenshot." },
  { label: "AI Win Prediction", sub: "Probability score, factor analysis", bg: "from-violet-700 to-purple-800", emoji: "🤖",
    prompt: "A modern SaaS web app panel screenshot showing AI-powered win probability analyzer for chargeback disputes. Circular gauge at 78% win probability, confidence HIGH. Key factors with green checkmarks for AVS Match, CVV Match, 3D Secure and red warnings for fraud signals. Purple color scheme. Photorealistic UI screenshot." },
  { label: "Dispute Detail View", sub: "Evidence, cover letter, case history", bg: "from-slate-700 to-slate-800", emoji: "📋",
    prompt: "A modern web app screenshot of a chargeback dispute case detail page with tabs for Case Details, Evidence, Cover Letter, Case History. Transaction data fields on left, uploaded evidence files list on right. Clean slate professional SaaS UI. Photorealistic UI screenshot." },
  { label: "Inventory Manager", sub: "SLA tracking, bulk assignment", bg: "from-emerald-700 to-teal-800", emoji: "📦",
    prompt: "A modern SaaS web application screenshot showing a chargeback inventory management table with case IDs, processor names, amounts, SLA countdown badges in red/orange/green, status chips, filter dropdowns and search bar. Green teal accents. Photorealistic UI screenshot." },
  { label: "Analytics & Reports", sub: "Anomaly detection, trend charts", bg: "from-cyan-700 to-blue-800", emoji: "📈",
    prompt: "A modern analytics dashboard screenshot for chargeback dispute management. Bar chart of win rates by reason code, line chart of monthly trends, donut chart of dispute outcomes. Cyan and blue color scheme. Professional SaaS reporting UI. Photorealistic UI screenshot." },
  { label: "Case Chain Tracking", sub: "1CB → 2CB → Arb with net recovery", bg: "from-orange-700 to-red-800", emoji: "🔗",
    prompt: "A modern web app screenshot showing dispute case chain timeline: First Chargeback -> Second Chargeback -> Pre-Arbitration -> Arbitration nodes connected by arrows. Each node shows status badge, amount, date. Net recovery shown at end. Orange red accents. Photorealistic UI screenshot." },
  { label: "Automation Pipeline", sub: "Zero-touch end-to-end processing", bg: "from-pink-700 to-rose-800", emoji: "⚡",
    prompt: "A modern SaaS web app screenshot showing automation pipeline configuration for chargeback disputes. Vertical flow: Import -> Enrich -> Evidence -> Cover Letter -> Submit steps with toggles and status indicators. Pink rose accents. Photorealistic UI screenshot." },
  { label: "Master Data Export", sub: "Full chain columns, CSV export", bg: "from-amber-700 to-yellow-800", emoji: "🗄️",
    prompt: "A modern web application screenshot showing a master data management table for chargeback disputes. Wide data table with columns: Case ID, Status, Merchant, Amount, Final Status, Net Recovery. Filters at top, export CSV button. Amber yellow accents. Professional SaaS data grid. Photorealistic UI screenshot." },
];

// Duplicate for seamless loop
const ITEMS = [...GALLERY_ITEMS, ...GALLERY_ITEMS];

export default function FeatureGallery() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [images, setImages] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem("gallery_images_v2");
    if (cached) {
      setImages(JSON.parse(cached));
      setGenerated(true);
    }
  }, []);

  const generateImages = async () => {
    setGenerating(true);
    const results = {};
    await Promise.all(
      GALLERY_ITEMS.map(async (item) => {
        try {
          const { url } = await base44.integrations.Core.GenerateImage({ prompt: item.prompt });
          results[item.label] = url;
        } catch {
          results[item.label] = null;
        }
      })
    );
    sessionStorage.setItem("gallery_images_v2", JSON.stringify(results));
    setImages(results);
    setGenerating(false);
    setGenerated(true);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let animationId;
    let pos = 0;
    const speed = 0.5;
    const totalWidth = track.scrollWidth / 2;

    const animate = () => {
      if (!paused) {
        pos += speed;
        if (pos >= totalWidth) pos = 0;
        track.style.transform = `translateX(-${pos}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [paused, generated]);

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <p className="text-[#0D50B8] text-sm font-bold tracking-widest uppercase mb-3">Platform Gallery</p>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">See the platform in action</h2>
        <p className="text-slate-500 text-lg max-w-xl mx-auto mb-6">A live preview of every major screen — hover to pause.</p>

        {!generated && (
          <button
            onClick={generateImages}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-[#0D50B8] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#0a3e90] transition-colors disabled:opacity-60 text-sm"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating screenshots... (~30s)
              </>
            ) : (
              <>🖼️ Generate AI Screenshots</>
            )}
          </button>
        )}
        {generated && (
          <button
            onClick={() => { sessionStorage.removeItem("gallery_images_v2"); setImages({}); setGenerated(false); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Regenerate screenshots
          </button>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-5 will-change-transform"
            style={{ width: "max-content" }}
          >
            {ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-72 rounded-2xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className={`relative bg-gradient-to-br ${item.bg} h-44 flex items-center justify-center overflow-hidden`}>
                  {images[item.label] ? (
                    <img
                      src={images[item.label]}
                      alt={item.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-1 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
                      {generating && <div className="text-white/60 text-xs mt-1">Generating...</div>}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white">
                  <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}