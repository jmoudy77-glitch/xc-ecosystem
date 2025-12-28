"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type KernelIngestStripeEventInput = {
  programId: string;
  eventType: string;
  amount: number;
  currency?: string | null;
  externalRef: string;
  calculationJson?: Record<string, any> | null;
};

type KernelIngestStripeEventResult = {
  canonicalEventId: string;
};

export async function kernelIngestStripeEvent(
  input: KernelIngestStripeEventInput
): Promise<KernelIngestStripeEventResult> {
  const params = {
    p_program_id: input.programId,
    p_event_type: input.eventType,
    p_amount: input.amount,
    p_currency: input.currency ?? "USD",
    p_external_ref: input.externalRef,
    p_calculation_json: input.calculationJson ?? {},
  };

  const { data, error } = await supabaseAdmin.rpc(
    "kernel_ingest_stripe_event",
    params
  );

  if (error) {
    throw new Error(`kernel_ingest_stripe_event failed: ${error.message}`);
  }

  const canonicalEventId = (data as string | undefined) ?? undefined;

  if (!canonicalEventId) {
    throw new Error("kernel_ingest_stripe_event returned empty id");
  }

  return { canonicalEventId };
}
