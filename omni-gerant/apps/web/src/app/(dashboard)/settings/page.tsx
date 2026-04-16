import { redirect } from 'next/navigation';

// BUSINESS RULE [SETTINGS-ROUTING]: /settings redirects to profile page
export default function SettingsIndexPage() {
  redirect('/settings/profile');
}
