// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// GET: debug in the browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Stripe webhook endpoint is alive',
  });
}

// POST: actual webhook handler
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text(); // raw body
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💸 payment_intent.succeeded', paymentIntent.id);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        console.log('✅ checkout.session.completed', {
          id: session.id,
          metadata,
        });

        const scope = metadata.scope as 'org' | 'athlete' | undefined;
        const tier = (metadata.tier as string) || 'elite';
        const orgId = metadata.orgId || metadata.org_id || null;

        const stripeCustomerId = session.customer as string | null;
        const stripeSubscriptionId = session.subscription as string | null;

        if (scope === 'org') {
          if (!orgId) {
            console.warn('⚠️ Org-level checkout but no orgId in metadata');
            break;
          }

          // 🔥 THIS is your org subscription update
          await db.organizations.update({
            where: { id: orgId },
            data: {
              subscription_tier: tier,
              stripe_customer_id: stripeCustomerId ?? undefined,
              stripe_subscription_id: stripeSubscriptionId ?? undefined,
              billing_status: 'active',
            },
          });

          console.log('✨ Org upgraded to', tier, 'orgId:', orgId);
        } else if (scope === 'athlete') {
          const userId = metadata.userId;
          if (!userId) {
          console.warn('⚠️ Athlete-level checkout but no userId in metadata');
    break;
  }

  await db.users.update({
    where: { id: userId },
    data: {
      subscription_tier: tier,
      stripe_customer_id: stripeCustomerId ?? undefined,
      stripe_subscription_id: stripeSubscriptionId ?? undefined,
      billing_status: 'active',
    },
  });

  console.log('✨ Athlete user upgraded to', tier, 'userId:', userId);
}

  break;
}


      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    }
  } catch (err) {
    console.error('❌ Error handling Stripe event:', err);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}

