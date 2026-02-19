import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check, Search, Upload, Download, MapPin, Loader2 } from "lucide-react";

const COUNTRIES = ["USA","UK","Australia","Canada","New Zealand","Germany","France","Netherlands","Spain","Italy","Sweden","Norway","Denmark","Switzerland","Austria","Belgium","Portugal","Ireland","Finland","Other"];

// All 50 US states with abbreviations
const US_STATES = [
  { name: "Alabama", abbr: "AL" }, { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" }, { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" }, { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" }, { name: "Delaware", abbr: "DE" },
  { name: "Florida", abbr: "FL" }, { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" }, { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" }, { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" }, { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" }, { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" }, { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" }, { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" }, { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" }, { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" }, { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" }, { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" }, { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" }, { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" }, { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" }, { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" }, { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" }, { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" }, { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" }, { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" }, { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" }, { name: "Wyoming", abbr: "WY" },
  { name: "Washington D.C.", abbr: "DC" },
];

// Major US cities per state (top cities)
const US_CITIES_BY_STATE = {
  AL: ["Birmingham","Montgomery","Huntsville","Mobile","Tuscaloosa"],
  AK: ["Anchorage","Fairbanks","Juneau","Sitka","Ketchikan"],
  AZ: ["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Glendale","Gilbert","Tempe"],
  AR: ["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro"],
  CA: ["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Irvine","Chula Vista"],
  CO: ["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo"],
  CT: ["Bridgeport","New Haven","Hartford","Stamford","Waterbury","Norwalk"],
  DE: ["Wilmington","Dover","Newark","Middletown"],
  FL: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Tallahassee","Fort Lauderdale","Port St. Lucie","Cape Coral","Pembroke Pines","Hollywood"],
  GA: ["Atlanta","Columbus","Augusta","Macon","Savannah","Athens","Sandy Springs","Roswell"],
  HI: ["Honolulu","Pearl City","Hilo","Kailua","Waipahu"],
  ID: ["Boise","Meridian","Nampa","Idaho Falls","Pocatello"],
  IL: ["Chicago","Aurora","Joliet","Naperville","Rockford","Springfield","Peoria","Elgin"],
  IN: ["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Hammond","Bloomington"],
  IA: ["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City"],
  KS: ["Wichita","Overland Park","Kansas City","Topeka","Olathe","Lawrence"],
  KY: ["Louisville","Lexington","Bowling Green","Owensboro","Covington"],
  LA: ["New Orleans","Baton Rouge","Shreveport","Metairie","Lafayette","Lake Charles"],
  ME: ["Portland","Lewiston","Bangor","South Portland","Auburn"],
  MD: ["Baltimore","Frederick","Rockville","Gaithersburg","Bowie","Hagerstown"],
  MA: ["Boston","Worcester","Springfield","Cambridge","Lowell","Brockton","New Bedford","Quincy"],
  MI: ["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Dearborn"],
  MN: ["Minneapolis","Saint Paul","Rochester","Duluth","Bloomington","Brooklyn Park","Plymouth"],
  MS: ["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi"],
  MO: ["Kansas City","Saint Louis","Springfield","Independence","Columbia","Lee's Summit"],
  MT: ["Billings","Missoula","Great Falls","Bozeman","Butte"],
  NE: ["Omaha","Lincoln","Bellevue","Grand Island","Kearney"],
  NV: ["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City"],
  NH: ["Manchester","Nashua","Concord","Derry","Dover"],
  NJ: ["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Lakewood","Toms River"],
  NM: ["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell"],
  NY: ["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle","Mount Vernon"],
  NC: ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington"],
  ND: ["Fargo","Bismarck","Grand Forks","Minot"],
  OH: ["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Parma","Canton"],
  OK: ["Oklahoma City","Tulsa","Norman","Broken Arrow","Lawton","Edmond","Moore"],
  OR: ["Portland","Eugene","Salem","Gresham","Hillsboro","Beaverton","Bend","Medford"],
  PA: ["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster"],
  RI: ["Providence","Cranston","Warwick","Pawtucket","East Providence"],
  SC: ["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville"],
  SD: ["Sioux Falls","Rapid City","Aberdeen","Brookings"],
  TN: ["Nashville","Memphis","Knoxville","Chattanooga","Clarksville","Murfreesboro","Jackson"],
  TX: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Irving","Garland","Frisco","McKinney"],
  UT: ["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden"],
  VT: ["Burlington","South Burlington","Rutland","Barre","Montpelier"],
  VA: ["Virginia Beach","Norfolk","Chesapeake","Richmond","Newport News","Alexandria","Hampton","Roanoke"],
  WA: ["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton"],
  WV: ["Charleston","Huntington","Morgantown","Parkersburg","Wheeling"],
  WI: ["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha"],
  WY: ["Cheyenne","Casper","Laramie","Gillette","Rock Springs"],
  DC: ["Washington"],
};

export default function GeographyManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [form, setForm] = useState({ city: "", state: "", country: "USA", status: "active" });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const fileRef = useRef();

  const load = () => base44.entities.Geography.list().then(d => { setRecords(d); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editId) await base44.entities.Geography.update(editId, form);
    else await base44.entities.Geography.create(form);
    setShowForm(false); setEditId(null);
    setForm({ city: "", state: "", country: "USA", status: "active" });
    load();
  };

  const del = async (id) => { await base44.entities.Geography.delete(id); load(); };
  const edit = (r) => { setForm({ city: r.city || "", state: r.state || "", country: r.country || "USA", status: r.status || "active" }); setEditId(r.id); setShowForm(true); };

  // Import all cities for a US state
  const importUSState = async () => {
    if (!selectedState) return;
    setBulkLoading(true);
    const stateObj = US_STATES.find(s => s.abbr === selectedState);
    const cities = US_CITIES_BY_STATE[selectedState] || [];
    const existing = records.filter(r => r.country === "USA" && r.state === stateObj.name).map(r => r.city);
    const toImport = cities.filter(c => !existing.includes(c));
    if (toImport.length === 0) {
      setImportMsg(`All cities for ${stateObj.name} already imported.`);
      setBulkLoading(false);
      return;
    }
    await base44.entities.Geography.bulkCreate(
      toImport.map(city => ({ city, state: stateObj.name, country: "USA", status: "active" }))
    );
    setImportMsg(`Imported ${toImport.length} cities for ${stateObj.name}.`);
    setBulkLoading(false);
    setSelectedState("");
    load();
    setTimeout(() => setImportMsg(""), 4000);
  };

  // Import all US states (all cities)
  const importAllUS = async () => {
    setBulkLoading(true);
    const existingSet = new Set(records.filter(r => r.country === "USA").map(r => `${r.city}|${r.state}`));
    const toCreate = [];
    US_STATES.forEach(st => {
      const cities = US_CITIES_BY_STATE[st.abbr] || [];
      cities.forEach(city => {
        const key = `${city}|${st.name}`;
        if (!existingSet.has(key)) toCreate.push({ city, state: st.name, country: "USA", status: "active" });
      });
    });
    if (toCreate.length === 0) {
      setImportMsg("All US cities already imported.");
      setBulkLoading(false);
      return;
    }
    // Batch in chunks of 50
    for (let i = 0; i < toCreate.length; i += 50) {
      await base44.entities.Geography.bulkCreate(toCreate.slice(i, i + 50));
    }
    setImportMsg(`Imported ${toCreate.length} US cities across all states.`);
    setBulkLoading(false);
    load();
    setTimeout(() => setImportMsg(""), 5000);
  };

  // CSV upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    // Skip header row if present
    const start = lines[0].toLowerCase().includes("city") ? 1 : 0;
    const rows = lines.slice(start).map(line => {
      const [city, state, country, status] = line.split(",").map(v => v?.trim().replace(/^"|"$/g, ""));
      return { city: city || "", state: state || "", country: country || "USA", status: status || "active" };
    }).filter(r => r.city || r.state);
    if (rows.length) {
      for (let i = 0; i < rows.length; i += 50) {
        await base44.entities.Geography.bulkCreate(rows.slice(i, i + 50));
      }
      setImportMsg(`Imported ${rows.length} locations from CSV.`);
    } else {
      setImportMsg("No valid rows found in file.");
    }
    setImporting(false);
    load();
    e.target.value = "";
    setTimeout(() => setImportMsg(""), 4000);
  };

  const downloadTemplate = () => {
    const csv = "city,state,country,status\nNew York,New York,USA,active\nLos Angeles,California,USA,active";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "geography_template.csv"; a.click();
  };

  const countries = [...new Set(records.map(r => r.country).filter(Boolean))];
  const filtered = records.filter(r => {
    const matchSearch = !search || r.city?.toLowerCase().includes(search.toLowerCase()) || r.state?.toLowerCase().includes(search.toLowerCase()) || r.country?.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "all" || r.country === countryFilter;
    return matchSearch && matchCountry;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-slate-500">{records.length} locations</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV Template
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="w-3.5 h-3.5 mr-1" /> {importing ? "Importing..." : "Upload CSV"}
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          <Button size="sm" className="bg-[#0D50B8] hover:bg-[#0a3d8f]" onClick={() => { setShowForm(true); setEditId(null); setForm({ city: "", state: "", country: "USA", status: "active" }); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Location
          </Button>
        </div>
      </div>

      {/* US Database Import Panel */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[#0D50B8]" />
            <p className="text-sm font-semibold text-slate-700">US Geography Database</p>
            <Badge className="bg-[#0D50B8]/10 text-[#0D50B8] border-0 text-xs">Built-in</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-3">Import major US cities and states in one click. Choose a specific state or load all 50 states at once.</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-52 bg-white text-sm">
                <SelectValue placeholder="Select a US State..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {US_STATES.map(s => (
                  <SelectItem key={s.abbr} value={s.abbr}>{s.name} ({s.abbr})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={importUSState} disabled={!selectedState || bulkLoading} className="bg-[#0D50B8] hover:bg-[#0a3d8f]">
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              Import State
            </Button>
            <Button size="sm" variant="outline" onClick={importAllUS} disabled={bulkLoading} className="border-[#0D50B8] text-[#0D50B8] hover:bg-blue-50">
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              Import All 50 States
            </Button>
          </div>
          {importMsg && (
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {importMsg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual Add Form */}
      {showForm && (
        <Card className="border-[#0D50B8]/20 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">City</label>
                <Input placeholder="City name" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">State / Province</label>
                <Input placeholder="State or Province" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Country</label>
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} className="bg-[#0D50B8] hover:bg-[#0a3d8f]"><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["City", "State / Province", "Country", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No locations found</td></tr>
              ) : filtered.slice(0, 200).map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.city || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.state || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.country || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={r.status === "active" ? "bg-green-100 text-green-800 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => del(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-xs text-slate-400 text-center py-3">Showing 200 of {filtered.length} results — use search to narrow down</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}