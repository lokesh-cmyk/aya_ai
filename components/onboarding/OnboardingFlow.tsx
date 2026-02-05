"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  CheckCircle2,
  Mail,
  MessageSquare,
  Sparkles,
  Users,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

export function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: "",
    teamSize: "",
    useCase: "",
    integrations: [] as string[],
  });

  const steps: OnboardingStep[] = [
    {
      id: "organization",
      title: "Set up your organization",
      description: "Let's start by creating your organization workspace",
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Inc."
                value={formData.organizationName}
                onChange={(e) =>
                  setFormData({ ...formData, organizationName: e.target.value })
                }
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500">
              This will be your workspace name. You can change it later.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamSize">Team Size</Label>
            <select
              id="teamSize"
              value={formData.teamSize}
              onChange={(e) =>
                setFormData({ ...formData, teamSize: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select team size</option>
              <option value="1">Just me</option>
              <option value="2-5">2-5 people</option>
              <option value="6-20">6-20 people</option>
              <option value="21-50">21-50 people</option>
              <option value="50+">50+ people</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "use-case",
      title: "What will you use AYA AI for?",
      description: "Help us customize your experience",
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "customer-support", label: "Customer Support", icon: "💬" },
              { id: "sales", label: "Sales & Outreach", icon: "📈" },
              { id: "marketing", label: "Marketing", icon: "📢" },
              { id: "internal", label: "Internal Communication", icon: "👥" },
            ].map((useCase) => (
              <button
                key={useCase.id}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, useCase: useCase.id })
                }
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  formData.useCase === useCase.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                disabled={isLoading}
              >
                <div className="text-2xl mb-2">{useCase.icon}</div>
                <div className="font-medium text-sm">{useCase.label}</div>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "integrations",
      title: "Connect your channels",
      description: "Select the communication channels you want to integrate",
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "gmail", label: "Gmail", logo: "/logos/gmail.svg" },
              { id: "slack", label: "Slack", logo: "/logos/slack.svg" },
              { id: "whatsapp", label: "WhatsApp", logo: "/logos/whatsapp.svg" },
              { id: "linkedin", label: "LinkedIn", logo: "/logos/linkedin.svg" },
              { id: "instagram", label: "Instagram", logo: "/logos/instagram.svg" },
              { id: "teams", label: "Microsoft Teams", logo: "/logos/teams.svg" },
            ].map((integration) => (
              <button
                key={integration.id}
                type="button"
                onClick={() => {
                  const newIntegrations = formData.integrations.includes(
                    integration.id
                  )
                    ? formData.integrations.filter((i) => i !== integration.id)
                    : [...formData.integrations, integration.id];
                  setFormData({ ...formData, integrations: newIntegrations });
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  formData.integrations.includes(integration.id)
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                disabled={isLoading}
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  <Image
                    src={integration.logo}
                    alt={integration.label}
                    width={32}
                    height={32}
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">{integration.label}</div>
                  <p className="text-xs text-gray-500">
                    Connect via secure Pipedream integration.
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            You can always add or manage channels later from Settings → Integrations.
          </p>
        </div>
      ),
    },
    {
      id: "connect-now",
      title: "Connect your channels now (optional)",
      description:
        "Finish setup and jump straight into connecting the channels you selected, powered by Pipedream Connect.",
      component: (
        <div className="space-y-4">
          {formData.integrations.length > 0 ? (
            <>
              <p className="text-sm text-gray-600">
                We&apos;ll take you to the Integrations page where you can complete the secure
                OAuth connection for these channels:
              </p>
              <div className="flex flex-wrap gap-3">
                {formData.integrations.map((id) => {
                  const meta: Record<string, { label: string; logo: string }> = {
                    gmail: { label: "Gmail", logo: "/logos/gmail.svg" },
                    slack: { label: "Slack", logo: "/logos/slack.svg" },
                    whatsapp: { label: "WhatsApp", logo: "/logos/whatsapp.svg" },
                    linkedin: { label: "LinkedIn", logo: "/logos/linkedin.svg" },
                    instagram: { label: "Instagram", logo: "/logos/instagram.svg" },
                    teams: { label: "Microsoft Teams", logo: "/logos/teams.svg" },
                  };
                  const integration = meta[id];
                  if (!integration) return null;

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-200"
                    >
                      <div className="w-5 h-5 rounded bg-white overflow-hidden flex items-center justify-center">
                        <Image
                          src={integration.logo}
                          alt={integration.label}
                          width={20}
                          height={20}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-800">
                        {integration.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                When you&apos;re ready, you can also connect additional channels from Settings → Integrations.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              You haven&apos;t selected any channels yet. You can still complete setup now and
              connect channels later from Settings → Integrations.
            </p>
          )}
        </div>
      ),
    },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.organizationName.trim() && formData.teamSize;
      case 1:
        return formData.useCase;
      case 2:
        return true; // Channel selection is optional
      case 3:
        return true; // Final connect step is optional
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Create organization
      if (formData.organizationName) {
        const teamResponse = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.organizationName,
            userId, // Pass userId so user is automatically assigned as ADMIN
          }),
        });

        if (teamResponse.ok) {
          const team = await teamResponse.json();
          console.log("Team created and user assigned:", team);
          // User is automatically assigned as ADMIN when creating team via /api/teams
          // No need for separate assign-team call
        } else {
          // Fallback: if team creation didn't assign user, try assign-team
          const team = await teamResponse.json().catch(() => null);
          if (team?.id) {
            try {
              await fetch("/api/users/assign-team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  teamId: team.id,
                }),
              });
            } catch (err) {
              console.error("Team assignment error:", err);
              // Continue anyway
            }
          }
        }
      }

      // Store onboarding data
      await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          onboardingData: formData,
        }),
      });

      // If user selected integrations, deep-link them to the Integrations page
      if (formData.integrations.length > 0) {
        const selected = encodeURIComponent(formData.integrations.join(","));
        router.push(`/settings/integrations?selected=${selected}`);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      // Even if something fails, continue UX flow
      if (formData.integrations.length > 0) {
        const selected = encodeURIComponent(formData.integrations.join(","));
        router.push(`/settings/integrations?selected=${selected}`);
      } else {
        onComplete();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AYA AI
            </span>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-600 mb-6">{steps[currentStep].description}</p>
            <div className="min-h-[300px]">{steps[currentStep].component}</div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0 || isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              size="lg"
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Complete Setup
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-blue-600"
                  : index < currentStep
                  ? "w-2 bg-green-500"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

