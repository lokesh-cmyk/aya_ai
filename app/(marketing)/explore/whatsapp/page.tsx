"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileText, Smartphone, BarChart3, Zap } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function WhatsAppRecapsPage() {
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
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30">
                <span className="text-[#25D366] text-sm font-medium">WhatsApp-First</span>
              </div>
              <div className="w-16 h-16 rounded-full border border-[#e6e6e6] flex items-center justify-center mb-8">
                <FileText className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                WhatsApp Recaps
                <br />
                <span className="text-[#111]/40">One-Tap Executive Actions</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                Aya delivers daily and weekly WhatsApp recaps to execs and owners, with one-tap actions, plus a web executive dashboard for drill-downs and approvals.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                ENABLE WHATSAPP RECAPS
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Phone mockup */}
            <div className="relative flex justify-center">
              <div className="w-[280px] h-[560px] bg-[#111] rounded-[40px] p-3 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {/* Status bar */}
                  <div className="h-8 bg-[#075E54] flex items-center justify-center">
                    <span className="text-white text-xs">WhatsApp</span>
                  </div>
                  {/* Chat header */}
                  <div className="h-14 bg-[#075E54] flex items-center px-4 gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                    <span className="text-white font-medium">AYA AI</span>
                  </div>
                  {/* Messages */}
                  <div className="p-3 space-y-3 bg-[#ECE5DD]">
                    {/* Recap message */}
                    <div className="bg-white rounded-lg p-3 max-w-[220px] shadow-sm">
                      <p className="text-xs font-medium text-[#075E54] mb-2">Daily Recap</p>
                      <p className="text-sm text-[#111] mb-3">3 items need your attention today</p>
                      {/* Action buttons */}
                      <div className="space-y-2">
                        <button className="w-full py-2 px-3 bg-[#25D366] text-white text-xs rounded-lg">
                          Approve Budget Request
                        </button>
                        <button className="w-full py-2 px-3 bg-[#25D366] text-white text-xs rounded-lg">
                          Review Project Status
                        </button>
                        <button className="w-full py-2 px-3 bg-[#f0f0f0] text-[#111] text-xs rounded-lg">
                          View All in Dashboard
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-right">9:00 AM</p>
                    </div>
                    {/* Quick response */}
                    <div className="bg-[#DCF8C6] rounded-lg p-3 max-w-[180px] ml-auto shadow-sm">
                      <p className="text-sm text-[#111]">Approved</p>
                      <p className="text-[10px] text-gray-500 mt-1 text-right">9:02 AM</p>
                    </div>
                    {/* Confirmation */}
                    <div className="bg-white rounded-lg p-3 max-w-[200px] shadow-sm">
                      <p className="text-sm text-[#111]">Done! Budget request approved and team notified.</p>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">9:02 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Why WhatsApp-first?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Smartphone className="w-6 h-6" />,
                title: "Always With You",
                description: "Get updates where you already are—no need to open another app or check email.",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "One-Tap Actions",
                description: "Approve, escalate, or delegate with a single tap. No forms, no friction.",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Web Dashboard",
                description: "Need to drill down? The full executive dashboard is one click away.",
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

      {/* Recap types */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Customizable recaps
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-8">
              <h3 className="text-xl font-medium mb-4">Daily Recap</h3>
              <p className="text-[#111]/60 mb-6">Every morning, get a summary of what needs your attention today.</p>
              <ul className="space-y-3">
                {[
                  "Pending approvals and decisions",
                  "Blockers reported by your team",
                  "Today's meetings and prep items",
                  "Critical messages requiring response",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-8">
              <h3 className="text-xl font-medium mb-4">Weekly Recap</h3>
              <p className="text-[#111]/60 mb-6">End your week with a comprehensive summary of progress and priorities.</p>
              <ul className="space-y-3">
                {[
                  "Key accomplishments this week",
                  "Open items and their status",
                  "Team performance highlights",
                  "Next week's priorities and risks",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Dashboard preview */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-6">
                Web dashboard for deep dives
              </h2>
              <p className="text-[#111]/60 text-lg mb-8">
                When you need more detail, the executive dashboard gives you full visibility into projects, teams, and decisions.
              </p>
              <div className="space-y-4">
                {[
                  "Real-time project status overview",
                  "Approval workflow management",
                  "Risk and issue tracking",
                  "Historical decision audit trail",
                  "Team performance analytics",
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#111] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="bg-[#f9f9f9] rounded-2xl p-8 border border-[#e6e6e6]">
              <div className="bg-white rounded-xl border border-[#e6e6e6] overflow-hidden">
                <div className="h-10 bg-[#f5f5f5] flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Executive Dashboard</span>
                    <span className="text-xs text-[#111]/50">Today</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#f9f9f9] rounded-lg p-3 text-center">
                      <p className="text-2xl font-medium">12</p>
                      <p className="text-xs text-[#111]/50">Active Projects</p>
                    </div>
                    <div className="bg-[#f9f9f9] rounded-lg p-3 text-center">
                      <p className="text-2xl font-medium">3</p>
                      <p className="text-xs text-[#111]/50">Pending</p>
                    </div>
                    <div className="bg-[#f9f9f9] rounded-lg p-3 text-center">
                      <p className="text-2xl font-medium">2</p>
                      <p className="text-xs text-[#111]/50">At Risk</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-[#e0e0e0] rounded" />
                    <div className="h-3 bg-[#e0e0e0] rounded w-4/5" />
                    <div className="h-3 bg-[#e0e0e0] rounded w-3/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Stay informed, stay decisive
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Get the information you need, where you need it, when you need it.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            ENABLE WHATSAPP RECAPS
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
