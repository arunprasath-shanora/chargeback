import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, period_month, stripe_secret_key } = await req.json();

    if (!stripe_secret_key) {
      return Response.json({ error: 'Stripe secret key is required' }, { status: 400 });
    }
    if (!period_month || !/^\d{4}-\d{2}$/.test(period_month)) {
      return Response.json({ error: 'period_month must be in YYYY-MM format' }, { status: 400 });
    }

    const stripe = new Stripe(stripe_secret_key, { apiVersion: '2023-10-16' });

    // Parse month range
    const [year, month] = period_month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    // Fetch settled charges (TC05) - only succeeded charges in month
    let charges = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const params = {
        created: { gte: startTs, lt: endTs },
        limit: 100,
        expand: ['data.balance_transaction'],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const resp = await stripe.charges.list(params);
      charges = charges.concat(resp.data.filter(c => c.status === 'succeeded' && !c.refunded));
      hasMore = resp.has_more;
      if (resp.data.length > 0) startingAfter = resp.data[resp.data.length - 1].id;
      else break;
    }

    // Settled count & amount (TC05)
    const tc05Count = charges.length;
    const tc05AmountUsd = charges.reduce((sum, c) => sum + (c.amount / 100), 0);

    // Fetch disputes (TC15) in the month
    let disputes = [];
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const params = {
        created: { gte: startTs, lt: endTs },
        limit: 100,
      };
      if (startingAfter) params.starting_after = startingAfter;

      const resp = await stripe.disputes.list(params);
      disputes = disputes.concat(resp.data);
      hasMore = resp.has_more;
      if (resp.data.length > 0) startingAfter = resp.data[resp.data.length - 1].id;
      else break;
    }

    const tc15Count = disputes.length;
    const tc15AmountUsd = disputes.reduce((sum, d) => sum + (d.amount / 100), 0);

    // Get account info to use as merchant info
    const account = await stripe.accounts.retrieve();
    const merchantName = account.business_profile?.name || account.email || 'Stripe Account';
    const merchantId = account.id;

    return Response.json({
      success: true,
      data: {
        merchant_id: merchantId,
        merchant_alias: merchantName,
        period_month,
        card_network: 'Visa', // default; Stripe doesn't expose network in basic API
        settled_txn_count: tc05Count,
        settled_txn_amount_usd: parseFloat(tc05AmountUsd.toFixed(2)),
        tc40_count: 0, // TC40 (fraud reports) not available via standard Stripe API
        tc40_amount_usd: 0,
        tc15_count: tc15Count,
        tc15_amount_usd: parseFloat(tc15AmountUsd.toFixed(2)),
        ce30_count: 0,
        source: 'api_import',
        notes: `Auto-imported from Stripe on ${new Date().toISOString().slice(0, 10)}`,
      },
      summary: {
        tc05_count: tc05Count,
        tc05_amount_usd: parseFloat(tc05AmountUsd.toFixed(2)),
        tc15_count: tc15Count,
        tc15_amount_usd: parseFloat(tc15AmountUsd.toFixed(2)),
        merchant_id: merchantId,
        merchant_name: merchantName,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});