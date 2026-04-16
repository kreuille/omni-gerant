export const metadata = {
  title: 'Maintenance en cours',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-4">&#x1f527;</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Maintenance en cours</h1>
        <p className="text-gray-600 mb-6">
          zenAdmin est temporairement indisponible pour maintenance.
          Nous serons de retour dans quelques minutes.
        </p>
        <p className="text-sm text-gray-400">
          Si le probleme persiste, contactez le support.
        </p>
      </div>
    </div>
  );
}
