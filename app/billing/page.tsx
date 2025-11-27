// app/billing/page.tsx
import { Suspense } from 'react';
import BillingPageClient from './BillingPageClient';

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading billing...</div>}>
      <BillingPageClient />
    </Suspense>
  );
}


