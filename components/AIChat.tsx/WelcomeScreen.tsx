"use client";

import { Sparkles, FileText, Mail, Calendar, Lightbulb } from "lucide-react";

interface WelcomeScreenProps {
  userName?: string;
}

export function WelcomeScreen({ userName }: WelcomeScreenProps) {
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 18) {
    greeting = "Good afternoon";
  } else if (currentHour >= 18) {
    greeting = "Good evening";
  }

  const suggestions = [
    {
      icon: FileText,
      text: "Summarize my recent projects",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Mail,
      text: "Check important emails",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Calendar,
      text: "Show today's calendar",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Lightbulb,
      text: "Give me productivity tips",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto">
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg animate-pulse">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
              {greeting},{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {userName || "there"}
                </span>
                <svg
                  className="absolute w-full h-3 -bottom-1 left-0 text-indigo-400"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 8 Q 50 2, 100 8 T 200 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              How can I assist you today? I'm here to help with your projects,
              emails, calendar, and more.
            </p>
          </div>
        </div>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-5 text-left transition-all hover:border-gray-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${suggestion.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}
                >
                  <suggestion.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {suggestion.text}
                  </p>
                </div>
              </div>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${suggestion.color} opacity-0 group-hover:opacity-5 transition-opacity`}
              />
            </button>
          ))}
        </div>

        {/* Info Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Start typing below or click a suggestion to begin
          </p>
        </div>
      </div>
    </div>
  );
}