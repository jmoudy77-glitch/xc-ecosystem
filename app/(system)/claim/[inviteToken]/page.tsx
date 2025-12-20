

// app/claim/[inviteToken]/page.tsx

import AthleteOnboardingPage from "@/app/(system)/onboarding/athlete/page";

export default function ClaimInvitePage() {
  // For now we reuse the canonical onboarding modal surface.
  // The onboarding form will be responsible for reading the invite token and
  // including it in the POST payload to /api/onboarding/athlete.
  return <AthleteOnboardingPage />;
}