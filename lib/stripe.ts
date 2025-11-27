// lib/stripe.ts
import Stripe from 'stripe';

// Optional but nice: fail fast if the env var is missing
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

