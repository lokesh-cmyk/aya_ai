"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Users, MessageSquare, Share2, Lock } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function TeamChatPage() {
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
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                Team Chat
                <br />
                <span className="text-[#111]/40">Collaborate Seamlessly</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                Built-in team messaging that connects with all your external channels. Share conversations, assign tasks, and stay aligned.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                START COLLABORATING
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustration */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="500" height="400" fill="#f9f9f9" rx="16" />
                {/* Team members */}
                <circle cx="150" cy="100" r="30" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="150" cy="92" r="12" stroke="#111" strokeWidth="0.5" fill="none" />
                <path d="M130 115 Q 150 130, 170 115" stroke="#111" strokeWidth="0.5" fill="none" />

                <circle cx="350" cy="100" r="30" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="350" cy="92" r="12" stroke="#111" strokeWidth="0.5" fill="none" />
                <path d="M330 115 Q 350 130, 370 115" stroke="#111" strokeWidth="0.5" fill="none" />

                <circle cx="250" cy="80" r="30" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="250" cy="72" r="12" stroke="#111" strokeWidth="0.5" fill="none" />
                <path d="M230 95 Q 250 110, 270 95" stroke="#111" strokeWidth="0.5" fill="none" />

                {/* Connection lines */}
                <line x1="180" y1="100" x2="220" y2="90" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <line x1="280" y1="90" x2="320" y2="100" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <line x1="250" y1="110" x2="250" y2="160" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />

                {/* Chat window */}
                <rect x="100" y="170" width="300" height="180" rx="12" stroke="#111" strokeWidth="1" fill="white" />
                <rect x="100" y="170" width="300" height="40" rx="12" fill="#f5f5f5" />
                <text x="120" y="195" fontSize="11" fill="#111" fontWeight="500">Team Chat</text>

                {/* Messages */}
                <rect x="120" y="230" width="120" height="30" rx="15" fill="#f0f0f0" />
                <rect x="135" y="240" width="60" height="6" rx="2" fill="#ccc" />

                <rect x="260" y="270" width="120" height="30" rx="15" fill="#111" />
                <rect x="275" y="280" width="60" height="6" rx="2" fill="#666" />

                <rect x="120" y="310" width="100" height="30" rx="15" fill="#f0f0f0" />
                <rect x="135" y="320" width="50" height="6" rx="2" fill="#ccc" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Team features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: "Channels & DMs",
                description: "Organize conversations by project, team, or topic with public channels and private messages.",
              },
              {
                icon: <Share2 className="w-6 h-6" />,
                title: "Share External Convos",
                description: "Forward client conversations to your team for quick collaboration and decision-making.",
              },
              {
                icon: <Lock className="w-6 h-6" />,
                title: "Secure & Private",
                description: "Enterprise-grade security with end-to-end encryption for all team communications.",
              },
            ].map((feature, index) => (
              <div key={index} className="p-6 rounded-2xl border border-[#e6e6e6]">
                <div className="w-12 h-12 rounded-full border border-[#e6e6e6] flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-[#111]/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Everything you need
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Real-time messaging with read receipts",
              "File and document sharing",
              "Voice and video calls",
              "Thread replies for organized discussions",
              "Mention team members with @mentions",
              "Emoji reactions and rich formatting",
              "Search across all team conversations",
              "Integration with external channels",
            ].map((capability, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e6e6e6]">
                <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Bring your team together
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            One place for team chat and external communications.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            GET STARTED FOR FREE
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
