"use client";

interface WorkflowStepperProps {
  currentStep: string;
}

const steps = [
  "Business Need",
  "Purchase Requisition",
  "Approval",
  "Vendor",
  "Negotiation",
  "Purchase Order",
  "Goods Receipt",
];

export default function WorkflowStepper({
  currentStep,
}: WorkflowStepperProps) {
  const currentIndex = steps.indexOf(
    currentStep
  );

  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex min-w-[800px] items-center">
        {steps.map((step, index) => {
          const completed =
            index < currentIndex;

          const active =
            index === currentIndex;

          return (
            <div
              key={step}
              className="flex flex-1 items-center"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-9 w-9 items-center justify-center
                    rounded-full border-2 text-sm font-semibold
                    ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : completed
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 bg-white text-gray-500"
                    }
                  `}
                >
                  {index + 1}
                </div>

                <span className="mt-2 whitespace-nowrap text-xs font-medium">
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                    mx-2 h-0.5 flex-1
                    ${
                      completed
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}