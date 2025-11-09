import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bell, FileText, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface SignupTutorialProps {
  open: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    icon: Bell,
    title: "Stay Updated with Notifications",
    description: "Receive general announcements from the Faculty Governor and department-specific updates from your Department Governor. React, comment, and reference important notifications."
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description: "Join multiple chat rooms including General, department-specific rooms, and custom rooms. Format messages, upload images, mention users with @username, and even chat with AI using @ai."
  },
  {
    icon: FileText,
    title: "Document Library",
    description: "Upload and access PDFs and documents with timestamps. Department governors and faculty staff can share important materials with role-based access control."
  },
  {
    icon: Users,
    title: "Connect with Peers",
    description: "View profiles of fellow students and faculty members. See usernames, departments, and contact information to stay connected with your academic community."
  }
];

export default function SignupTutorial({ open, onClose }: SignupTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const markTutorialComplete = async () => {
    try {
      await fetch('/api/auth/tutorial', {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await markTutorialComplete();
      onClose();
    }
  };

  const handleSkip = async () => {
    await markTutorialComplete();
    onClose();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to CIE Portal</DialogTitle>
          <DialogDescription>
            Let's take a quick tour of what you can do
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          
          <div className="flex justify-center gap-2 pt-4">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            data-testid="button-tutorial-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <Button onClick={handleSkip} variant="ghost" data-testid="button-tutorial-skip">
            Skip
          </Button>
          
          <Button onClick={handleNext} data-testid="button-tutorial-next">
            {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            {currentStep < tutorialSteps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
