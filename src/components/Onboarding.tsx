import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingStep {
  title: string
  description: string
  icon: string
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to PowerFlow",
    description: "Your smart electricity wallet. Buy kWh via M-Pesa and transfer to your meters instantly.",
    icon: "⚡"
  },
  {
    title: "Connect Your Meter",
    description: "Link your Tuya 4G smart meter to start. Scan the QR code or enter the device ID manually.",
    icon: "📱"
  },
  {
    title: "Recharge Anytime",
    description: "Use M-Pesa to recharge your wallet. Your balance is secure and synced across all your meters.",
    icon: "💳"
  },
  {
    title: "Monitor Usage",
    description: "Track your energy consumption with detailed analytics. Get insights to save power and money.",
    icon: "📊"
  }
]

const ONBOARDING_KEY = "powerflow_onboarding_complete"

interface OnboardingProps {
  onComplete?: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setIsOpen(true)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsOpen(false)
    onComplete?.()
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) return null

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[hsl(228,55%,12%)] to-[hsl(228,50%,8%)] rounded-3xl p-6 border border-primary/20 shadow-2xl animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-muted/30 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full gradient-cyan transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">{step.icon}</span>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-3">{step.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === currentStep ? "w-6 gradient-cyan" : "bg-muted/50"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={cn(
              "p-3 rounded-xl transition-colors",
              currentStep === 0 
                ? "text-muted-foreground/30 cursor-not-allowed" 
                : "text-foreground hover:bg-white/10"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <Button
            onClick={handleNext}
            className="flex-1 gradient-cyan text-[hsl(var(--navy)) font-bold rounded-xl h-12"
          >
            {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY)
}
