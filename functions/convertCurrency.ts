import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fetch historical FX rate from open.er-api.com (free, no key needed for latest)
// Falls back to frankfurter.app for historical rates
async function getHistoricalRate(fromCurrency, date) {
  const upper = fromCurrency.toUpperCase();
  if (upper === "USD") return 1.0;

  // Try frankfurter.app for historical rates (free, no API key)
  const dateStr = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const url = `https://api.frankfurter.app/${dateStr}?from=${upper}&to=USD`;

  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    if (data.rates && data.rates.USD) return data.rates.USD;
  }

  // Fallback: try latest rate
  const latestRes = await fetch(`https://api.frankfurter.app/latest?from=${upper}&to=USD`);
  if (latestRes.ok) {
    const data = await latestRes.json();
    if (data.rates && data.rates.USD) return data.rates.USD;
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { currency, amount, date } = await req.json();

    if (!currency || amount === undefined || amount === null) {
      return Response.json({ error: "currency and amount are required" }, { status: 400 });
    }

    const rate = await getHistoricalRate(currency, date);
    if (rate === null) {
      return Response.json({ error: `Could not fetch FX rate for ${currency}` }, { status: 422 });
    }

    const usd_amount = Math.round(parseFloat(amount) * rate * 100) / 100;
    return Response.json({ usd_amount, rate, currency, date });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});