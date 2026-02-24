import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const GALLERY_PROMPTS = [
  {
    label: "Production Dashboard",
    sub: "Live KPIs, win rates, SLA alerts",
    bg: "from-blue-700 to-indigo-800",
    prompt: "A modern dark-themed web application dashboard screenshot showing chargeback dispute management. Key metrics cards showing win rate 85%, total disputes 1,240, recovered amount $2.1M, pending SLA 34. Blue and indigo color scheme. Charts showing monthly win rate trends as line graphs. Clean professional SaaS UI with sidebar navigation. High quality UI screenshot style."
  },
  {
    label: "AI Win Prediction",
    sub: "Probability score, factor analysis",
    bg: "from-violet-700 to-purple-800",
    prompt: "A modern SaaS web app panel screenshot showing an AI-powered win probability analyzer for chargeback disputes. Shows a circular gauge meter at 78% win probability, confidence level HIGH. Below it shows key factors like AVS Match, CVV Match, 3D Secure as green checkmarks, and fraud signals as red warnings. Purple and violet color scheme. Clean professional UI screenshot."
  },
  {
    label: "Dispute Detail View",
    sub: "Evidence, cover letter, case history",
    bg: "from-slate-700 to-slate-800",
    prompt: "A modern web application screenshot of a chargeback dispute case detail page. Shows tabs for Case Details, Evidence, Cover Letter, Case History. Left panel shows transaction data fields like Case ID, Merchant, Amount $450, Date, Reason Code. Right side shows uploaded evidence files list with icons. Clean slate/dark professional SaaS UI."
  },
  {
    label: "Inventory Manager",
    sub: "SLA tracking, bulk assignment",
    bg: "from-emerald-700 to-teal-800",
    prompt: "A modern SaaS web application screenshot showing a chargeback inventory management table. Table rows show case IDs, processor names, amounts, SLA deadline countdown badges in red/orange/green colors, status chips. Top has filter dropdowns and a search bar. Green and teal color accents. Sortable columns. Professional clean UI screenshot."
  },
  {
    label: "Analytics & Reports",
    sub: "Anomaly detection, trend charts",
    bg: "from-cyan-700 to-blue-800",
    prompt: "A modern analytics dashboard screenshot for chargeback dispute management software. Shows multiple charts: a bar chart of win rates by reason code, a line chart of monthly trends, a donut chart showing dispute outcomes won/lost/not fought. Cyan and blue color scheme. Data cards with percentages. Clean professional SaaS reporting UI."
  },
  {
    label: "Case Chain Tracking",
    sub: "1CB → 2CB → Arb with net recovery",
    bg: "from-orange-700 to-red-800",
    prompt: "A modern web app screenshot showing a dispute case chain timeline. Shows a horizontal chain visualization: First Chargeback -> Second Chargeback -> Pre-Arbitration -> Arbitration nodes connected by arrows. Each node shows status badge won/lost, amount, and date. Net recovery amount shown at end. Orange and red color accents. Clean professional dispute management UI."
  },
  {
    label: "Automation Pipeline",
    sub: "Zero-touch end-to-end processing",
    bg: "from-pink-700 to-rose-800",
    prompt: "A modern SaaS web app screenshot showing an automation pipeline configuration interface for chargeback disputes. Shows a vertical flow diagram with steps: Import Cases -> Enrich Data -> Fetch Evidence -> Generate Cover Letter -> Submit. Each step has a green checkmark or toggle switch. Pipeline run logs on right side. Pink and rose color accents. Clean professional UI."
  },
  {
    label: "Master Data Export",
    sub: "Full chain columns, CSV export",
    bg: "from-amber-700 to-yellow-800",
    prompt: "A modern web application screenshot showing a master data management table for chargeback disputes. Wide data table with many columns: Case ID, Status, Merchant, Amount, Final Status, Parent Case, 2nd CB Status, Net Recovery. Filters at top, export to CSV button. Row highlighting on hover. Amber and yellow color accents. Professional SaaS data grid UI."
  },
];

export default function GalleryImageLoader({ onImagesReady }) {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("gallery_images");
    if (cached) {
      setImages(JSON.parse(cached));
      setLoading(false);
      if (onImagesReady) onImagesReady(JSON.parse(cached));
      return;
    }

    const generate = async () => {
      const results = {};
      await Promise.all(
        GALLERY_PROMPTS.map(async (item) => {
          try {
            const { url } = await base44.integrations.Core.GenerateImage({ prompt: item.prompt });
            results[item.label] = url;
          } catch {
            results[item.label] = null;
          }
        })
      );
      sessionStorage.setItem("gallery_images", JSON.stringify(results));
      setImages(results);
      setLoading(false);
      if (onImagesReady) onImagesReady(results);
    };

    generate();
  }, []);

  return { images, loading, prompts: GALLERY_PROMPTS };
}

export { GALLERY_PROMPTS };