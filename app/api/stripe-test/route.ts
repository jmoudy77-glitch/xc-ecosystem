import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // Fetch a list of products from Stripe (in test mode)
    const products = await stripe.products.list({ limit: 1 })
    return NextResponse.json({ ok: true, products }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
