import { redirect } from 'next/navigation';

export default function OnboardingRedirect() {
  redirect('/step-1');
}
