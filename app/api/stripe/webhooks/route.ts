// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
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
        console.log('✅ checkout.session.completed', session.id);

        const userId = session.metadata?.userId;
        if (userId) {
          // await db.user.update({ where: { id: userId }, data: { tier: 'elite' } });
          console.log('✨ Upgrade user to elite:', userId);
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
