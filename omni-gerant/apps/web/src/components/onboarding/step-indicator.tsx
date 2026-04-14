'use client';

// BUSINESS RULE [CDC-4]: Indicateur d'etapes onboarding

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '\u2713' : step}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div className={`w-12 h-0.5 mx-1 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
