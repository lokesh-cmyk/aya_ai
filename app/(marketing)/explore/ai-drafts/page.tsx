"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles, Zap, Brain, Palette } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function AIDraftsPage() {
  return (
    <div className="min-h-screen bg-white text-[#111]" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border border-[#111] flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg font-medium tracking-tight">AYA</span>
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-[#111] text-white px-5 py-2 rounded-full hover:bg-[#333] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Back Link */}
      <div className="pt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-[#111]/60 hover:text-[#111] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-8 pb-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-16 h-16 rounded-full border border-[#e6e6e6] flex items-center justify-center mb-8">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                AI Drafts
                <br />
                <span className="text-[#111]/40">That Sound Like You</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                AYA learns your unique communication style and generates responses that maintain your voice across every platform.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                TRY AI DRAFTS
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustration */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="500" height="400" fill="#f9f9f9" rx="16" />
                {/* Message bubble incoming */}
                <rect x="50" y="80" width="200" height="60" rx="8" stroke="#111" strokeWidth="0.5" fill="white" />
                <rect x="70" y="95" width="120" height="8" rx="2" fill="#e0e0e0" />
                <rect x="70" y="110" width="80" height="8" rx="2" fill="#e0e0e0" />
                {/* AI processing */}
                <circle cx="250" cy="200" r="40" stroke="#111" strokeWidth="0.5" fill="white" strokeDasharray="4,4" />
                <text x="250" y="205" textAnchor="middle" fontSize="12" fill="#111">AI</text>
                {/* Sparkle lines */}
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line
                    key={angle}
                    x1={250 + 50 * Math.cos((angle * Math.PI) / 180)}
                    y1={200 + 50 * Math.sin((angle * Math.PI) / 180)}
                    x2={250 + 60 * Math.cos((angle * Math.PI) / 180)}
                    y2={200 + 60 * Math.sin((angle * Math.PI) / 180)}
                    stroke="#111"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Response bubble */}
                <rect x="250" y="280" width="200" height="80" rx="8" stroke="#111" strokeWidth="1" fill="white" />
                <rect x="270" y="295" width="140" height="8" rx="2" fill="#111" />
                <rect x="270" y="310" width="100" height="8" rx="2" fill="#e0e0e0" />
                <rect x="270" y="325" width="120" height="8" rx="2" fill="#e0e0e0" />
                {/* Arrow */}
                <path d="M250 160 L250 240" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <polygon points="250,270 245,260 255,260" fill="#111" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                icon: <Brain className="w-6 h-6" />,
                title: "Learn Your Style",
                description: "AYA analyzes your past messages to understand your tone, vocabulary, and communication patterns.",
              },
              {
                step: "02",
                icon: <Zap className="w-6 h-6" />,
                title: "Generate Drafts",
                description: "When a message arrives, AYA instantly creates a contextually appropriate response in your voice.",
              },
              {
                step: "03",
                icon: <Palette className="w-6 h-6" />,
                title: "Review & Send",
                description: "Review the draft, make any adjustments, and send with confidence—or let it send automatically.",
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[#111]/30 text-4xl font-light">{item.step}</span>
                  <div className="w-10 h-10 rounded-full border border-[#e6e6e6] flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2">{item.title}</h3>
                <p className="text-[#111]/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Key capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Tone Matching",
                description: "Professional for work emails, casual for friend chats—AYA adapts automatically.",
              },
              {
                title: "Context Awareness",
                description: "Understands the full conversation thread to generate relevant responses.",
              },
              {
                title: "Multi-language Support",
                description: "Generate responses in any language while maintaining your communication style.",
              },
              {
                title: "Smart Suggestions",
                description: "Get multiple draft options to choose from for important messages.",
              },
              {
                title: "Learning Mode",
                description: "AYA continuously improves based on your edits and preferences.",
              },
              {
                title: "Privacy First",
                description: "Your data stays secure—style learning happens locally on your device.",
              },
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-[#e6e6e6]">
                <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h3 className="font-medium mb-2">{feature.title}</h3>
                  <p className="text-[#111]/60 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Write faster, sound like you
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Let AYA handle the first draft while you focus on what matters.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            START WRITING SMARTER
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#111]/50">
              © <CurrentYear /> AYA. All rights reserved.
            </p>
            <Link href="/explore" className="text-sm text-[#111]/60 hover:text-[#111] transition-colors">
              Explore More Features
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
