// app/billing/page.tsx
import { Suspense } from "react";
import { BillingPageClient } from "./BillingPageClient";

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading billing page…</div>}>
      <div className="p-6">
        <BillingPageClient />
      </div>
    </Suspense>
  );
}



