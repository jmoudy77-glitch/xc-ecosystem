// pages/api/webhooks/stripe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false, // ❗ required: Stripe needs the raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    // Stripe only sends POST; anything else gets 405
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const signature = req.headers["stripe-signature"] as string | undefined;
  if (!signature) {
    console.error("❌ Missing Stripe signature header");
    return res.status(401).send("Unauthorized");
  }

  // Read the raw body
  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", reject);
  });
  const rawBody = Buffer.concat(chunks);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("💸 payment_intent.succeeded", paymentIntent.id);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ checkout.session.completed", session.id);

        // 🔑 Hook for upgrading the coach/program to elite
        const userId = session.metadata?.userId;
        if (userId) {
          // TODO: replace with your real DB update
          // await db.user.update({
          //   where: { id: userId },
          //   data: { tier: "elite" },
          // });
          console.log("✨ Upgrade user to elite:", userId);
        }
        break;
      }
      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    }
  } catch (err) {
    console.error("❌ Error handling Stripe event:", err);
    return res.status(500).send("Webhook handler failed");
  }

  return res.json({ received: true });
}
