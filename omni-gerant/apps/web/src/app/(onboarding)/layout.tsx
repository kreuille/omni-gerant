// BUSINESS RULE [CDC-4]: Layout onboarding (sans sidebar)

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">zenAdmin</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
