import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

function extractProgramId(event: Stripe.Event): string | null {
  const obj: any = event.data?.object ?? {};
  const md = obj?.metadata ?? {};
  if (md?.program_id) return String(md.program_id);
  return null;
}

function amountFromEvent(event: Stripe.Event): { amount: number; currency: string } {
  const obj: any = event.data?.object ?? {};
  const currency = obj?.currency ? String(obj.currency).toUpperCase() : 'USD';

  const cents =
    typeof obj?.amount_paid === 'number' ? obj.amount_paid :
    typeof obj?.amount_total === 'number' ? obj.amount_total :
    typeof obj?.amount_due === 'number' ? obj.amount_due :
    typeof obj?.amount === 'number' ? obj.amount :
    0;

  return { amount: cents / 100, currency };
}

function economicEventType(event: Stripe.Event): string {
  switch (event.type) {
    case 'invoice.paid':
      return 'invoice_paid';
    case 'invoice.payment_failed':
      return 'invoice_payment_failed';
    case 'charge.refunded':
      return 'charge_refunded';
    case 'checkout.session.completed':
      return 'checkout_session_completed';
    case 'customer.subscription.created':
      return 'subscription_created';
    case 'customer.subscription.updated':
      return 'subscription_updated';
    case 'customer.subscription.deleted':
      return 'subscription_deleted';
    default:
      return `stripe_${event.type.replace(/\./g, '_')}`;
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ ok: false, error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `Webhook signature verification failed: ${err?.message ?? 'unknown'}` },
      { status: 400 }
    );
  }

  const programId = extractProgramId(event);

  // Kernel requires program binding; otherwise we accept but skip ledger insertion.
  if (!programId) {
    return NextResponse.json({ ok: true, received: true, skipped: true, reason: 'missing program_id metadata' });
  }

  const { amount, currency } = amountFromEvent(event);
  const ledgerType = economicEventType(event);

  const supabase = createClient();

  const { data, error } = await supabase.rpc('kernel_ingest_stripe_economic_event', {
    p_program_id: programId,
    p_event_type: ledgerType,
    p_amount: amount,
    p_currency: currency,
    p_external_ref: event.id,
    p_status: 'posted',
    p_calculation_json: {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      created: event.created,
      livemode: (event as any).livemode ?? null,
      object: (event.data as any)?.object ?? null,
    },
    p_causality: { stripe_event_id: event.id, stripe_event_type: event.type },
    p_payload: { route: '/api/stripe/webhook' },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: `kernel_ingest_stripe_economic_event failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, received: true, canonicalEventId: data });
}
