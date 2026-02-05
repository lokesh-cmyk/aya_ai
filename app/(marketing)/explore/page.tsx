"use client";

import Link from "next/link";
import { ArrowRight, Inbox, Sparkles, Clock, Users, MessageSquare, FileText } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function ExplorePage() {
  const features = [
    {
      id: "smart-inbox",
      icon: <Inbox className="w-8 h-8" />,
      title: "Smart Inbox",
      subtitle: "Unified Communications",
      description: "All your channels in one place—Gmail, LinkedIn, Slack, WhatsApp & Instagram.",
      href: "/explore/smart-inbox",
    },
    {
      id: "ai-drafts",
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI Drafts",
      subtitle: "Intelligent Responses",
      description: "AI that learns your communication style and drafts replies that sound like you.",
      href: "/explore/ai-drafts",
    },
    {
      id: "briefings",
      icon: <Clock className="w-8 h-8" />,
      title: "Daily Briefings",
      subtitle: "Morning Summaries",
      description: "Wake up to prioritized action items and crucial message summaries.",
      href: "/explore/briefings",
    },
    {
      id: "team-chat",
      icon: <Users className="w-8 h-8" />,
      title: "Team Chat",
      subtitle: "Collaboration Tools",
      description: "Real-time collaboration with your team, integrated with all your channels.",
      href: "/explore/team-chat",
    },
    {
      id: "meetings",
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Meeting Intelligence",
      subtitle: "From Meetings to Plans",
      description: "Aya turns meetings, messages, and docs into plans, owners, and outcomes.",
      href: "/explore/meetings",
    },
    {
      id: "whatsapp",
      icon: <FileText className="w-8 h-8" />,
      title: "WhatsApp Recaps",
      subtitle: "Executive Dashboard",
      description: "Daily/weekly WhatsApp recaps to execs and owners with one-tap actions.",
      href: "/explore/whatsapp",
    },
  ];

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

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-xs text-[#8B4513] uppercase tracking-widest mb-4 font-medium">EXPLORE AYA</p>
            <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
              Discover what makes
              <br />
              <span className="text-[#111]/40">AYA different</span>
            </h1>
            <p className="text-xl text-[#111]/60 max-w-xl">
              Explore our suite of AI-powered tools designed to transform how you manage communications.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.id}
                href={feature.href}
                className="group rounded-2xl border border-[#e6e6e6] p-8 hover:border-[#111]/30 hover:shadow-sm transition-all"
              >
                <div className="w-14 h-14 rounded-full border border-[#e6e6e6] flex items-center justify-center mb-6 group-hover:border-[#111]/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-[#111]/50 mb-4">{feature.subtitle}</p>
                <p className="text-[#111]/70 mb-6">{feature.description}</p>
                <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Ready to transform your inbox?
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Join thousands of professionals using AYA to stay on top of every conversation.
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
            <Link href="/" className="text-sm text-[#111]/60 hover:text-[#111] transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
