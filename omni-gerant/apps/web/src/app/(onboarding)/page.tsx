import { redirect } from 'next/navigation';

// Redirect to step 1
export default function OnboardingPage() {
  redirect('/step-1');
}
