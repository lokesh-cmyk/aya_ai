"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Inbox, Mail, MessageCircle, Linkedin } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function SmartInboxPage() {
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
                <Inbox className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                Smart Inbox
                <br />
                <span className="text-[#111]/40">Unified Communications</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                Stop switching between apps. AYA brings all your communication channels into one powerful, AI-enhanced inbox.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                TRY SMART INBOX
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustration */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="500" height="400" fill="#f9f9f9" rx="16" />
                {/* Central inbox */}
                <rect x="150" y="120" width="200" height="160" rx="8" stroke="#111" strokeWidth="1" fill="white" />
                <line x1="150" y1="160" x2="350" y2="160" stroke="#111" strokeWidth="0.5" />
                {/* Message lines */}
                {[0, 1, 2, 3].map((i) => (
                  <g key={i}>
                    <rect x="170" y={175 + i * 25} width="160" height="16" rx="2" fill="#f0f0f0" />
                    <circle cx="180" cy={183 + i * 25} r="4" fill="#ddd" />
                  </g>
                ))}
                {/* Connecting lines from platforms */}
                <path d="M60 150 Q 100 150, 150 180" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <path d="M60 250 Q 100 250, 150 220" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <path d="M440 150 Q 400 150, 350 180" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                <path d="M440 250 Q 400 250, 350 220" stroke="#111" strokeWidth="0.5" strokeDasharray="4,4" />
                {/* Platform icons */}
                <circle cx="45" cy="150" r="20" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="45" cy="250" r="20" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="455" cy="150" r="20" stroke="#111" strokeWidth="0.5" fill="white" />
                <circle cx="455" cy="250" r="20" stroke="#111" strokeWidth="0.5" fill="white" />
                <text x="45" y="155" textAnchor="middle" fontSize="12" fill="#111">G</text>
                <text x="45" y="255" textAnchor="middle" fontSize="12" fill="#111">S</text>
                <text x="455" y="155" textAnchor="middle" fontSize="12" fill="#111">L</text>
                <text x="455" y="255" textAnchor="middle" fontSize="12" fill="#111">W</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            All your channels, <span className="text-[#111]/40">one inbox</span>
          </h2>
          <div className="grid md:grid-cols-5 gap-6">
            {[
              { name: "Gmail", icon: <Mail className="w-6 h-6" /> },
              { name: "LinkedIn", icon: <Linkedin className="w-6 h-6" /> },
              { name: "Slack", icon: <MessageCircle className="w-6 h-6" /> },
              { name: "WhatsApp", icon: <MessageCircle className="w-6 h-6" /> },
              { name: "Instagram", icon: <MessageCircle className="w-6 h-6" /> },
            ].map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-[#e6e6e6] hover:border-[#111]/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full border border-[#e6e6e6] flex items-center justify-center">
                  {platform.icon}
                </div>
                <span className="font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Key features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Priority Sorting",
                description: "AI automatically prioritizes messages based on urgency and importance.",
              },
              {
                title: "Smart Filters",
                description: "Create custom filters to organize conversations by client, project, or topic.",
              },
              {
                title: "Quick Actions",
                description: "Archive, snooze, or respond with a single click across all platforms.",
              },
              {
                title: "Search Everything",
                description: "Find any message across all channels with powerful unified search.",
              },
              {
                title: "Thread View",
                description: "See complete conversation history regardless of which platform it started on.",
              },
              {
                title: "Real-time Sync",
                description: "Changes sync instantly across all your devices and platforms.",
              },
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
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
            Ready to unify your inbox?
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Join professionals who use AYA to manage all their communications in one place.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            GET STARTED FREE
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
