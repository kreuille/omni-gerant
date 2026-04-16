import { redirect } from 'next/navigation';

// BUSINESS RULE [UI-404]: /onboarding redirects to first step
export default function OnboardingPage() {
  redirect('/step-1');
}
