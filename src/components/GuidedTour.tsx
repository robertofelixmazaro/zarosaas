import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
}

const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="agendamentos"]',
    title: "👉 Este é o painel de agendamentos",
    description: "Aqui você verá todos os clientes que marcaram horário.",
  },
  {
    targetSelector: '[data-tour="servicos"]',
    title: "👉 Aqui você pode criar seus serviços",
    description: "Adicione os serviços que sua empresa oferece.",
  },
  {
    targetSelector: '[data-tour="barbeiros"]',
    title: "👉 Aqui você adiciona profissionais",
    description: "Configure os profissionais que atendem na empresa.",
  },
  {
    targetSelector: '[data-tour="landing"]',
    title: "👉 Aqui você pode compartilhar sua página",
    description: "Envie o link da sua página para seus clientes agendarem.",
  },
];

interface GuidedTourProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const GuidedTour = ({ onComplete, onSkip }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  const positionTooltip = useCallback(() => {
    const step = tourSteps[currentStep];
    const el = document.querySelector(step.targetSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Highlight element
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "z-[60]", "relative", "rounded-lg");

    const tooltipTop = rect.bottom + window.scrollY + 12;
    const tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 340));

    setTooltipPos({ top: tooltipTop, left: tooltipLeft });
    setVisible(true);
  }, [currentStep]);

  useEffect(() => {
    // Clean previous highlights
    document.querySelectorAll("[data-tour]").forEach((el) => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "z-[60]", "relative", "rounded-lg");
    });

    const timer = setTimeout(positionTooltip, 200);
    return () => clearTimeout(timer);
  }, [currentStep, positionTooltip]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setVisible(false);
      setCurrentStep((s) => s + 1);
    } else {
      cleanup();
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setVisible(false);
      setCurrentStep((s) => s - 1);
    }
  };

  const cleanup = () => {
    document.querySelectorAll("[data-tour]").forEach((el) => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "z-[60]", "relative", "rounded-lg");
    });
  };

  const handleSkip = () => {
    cleanup();
    onComplete();
  };

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={handleSkip} />

      {/* Tooltip */}
      {visible && (
        <div
          className="fixed z-[65] w-80 max-w-[calc(100vw-32px)] bg-card border rounded-xl shadow-2xl p-5 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-3">
            <h4 className="font-semibold text-base pr-6">{step.title}</h4>
            <p className="text-sm text-muted-foreground">{step.description}</p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} de {tourSteps.length}
              </span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    Anterior
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {currentStep === tourSteps.length - 1 ? "Finalizar tour" : "Próximo"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GuidedTour;
