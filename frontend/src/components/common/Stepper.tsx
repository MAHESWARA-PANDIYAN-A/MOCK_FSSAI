import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  totalSteps?: number;
  steps?: string[];
  onStepClick?: (step: number) => void;
}

export const DEFAULT_WIZARD_STEPS = [
  'Applicant',
  'Business',
  'Activity',
  'Premises',
  'Products',
  'Documents',
  'Review',
  'OTP Verify',
  'Submit'
];

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  steps = DEFAULT_WIZARD_STEPS,
  onStepClick,
}) => {
  return (
    <div className="w-full py-4 bg-white border border-slate-200 rounded-lg shadow-sm px-4 mb-6">
      <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-thin">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <React.Fragment key={label}>
              <div
                className={`flex flex-col items-center min-w-[70px] ${
                  onStepClick && isCompleted ? 'cursor-pointer' : ''
                }`}
                onClick={() => {
                  if (onStepClick && isCompleted) {
                    onStepClick(stepNum);
                  }
                }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-gov-700 text-white ring-4 ring-blue-100 shadow-sm'
                      : 'bg-slate-100 text-slate-500 border border-slate-300'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium whitespace-nowrap text-center ${
                    isCurrent
                      ? 'text-gov-800 font-bold'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 min-w-[16px] transition-colors ${
                    stepNum < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
