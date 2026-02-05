"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MessageSquare, Target, Users, ClipboardList } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function MeetingsPage() {
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
                <MessageSquare className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                Meeting Intelligence
                <br />
                <span className="text-[#111]/40">From Chaos to Clarity</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                Aya turns meetings, messages, and docs into plans, owners, and outcomes—then runs the operating cadence like a lightweight PMO.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                TRANSFORM YOUR MEETINGS
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustration */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="500" height="400" fill="#f9f9f9" rx="16" />

                {/* Meeting input - left side */}
                <rect x="40" y="80" width="120" height="80" rx="8" stroke="#111" strokeWidth="0.5" fill="white" />
                <text x="100" y="110" textAnchor="middle" fontSize="10" fill="#666">Meeting</text>
                <rect x="55" y="120" width="90" height="6" rx="2" fill="#e0e0e0" />
                <rect x="55" y="130" width="70" height="6" rx="2" fill="#e0e0e0" />

                <rect x="40" y="180" width="120" height="60" rx="8" stroke="#111" strokeWidth="0.5" fill="white" />
                <text x="100" y="205" textAnchor="middle" fontSize="10" fill="#666">Messages</text>
                <rect x="55" y="215" width="90" height="6" rx="2" fill="#e0e0e0" />

                <rect x="40" y="260" width="120" height="60" rx="8" stroke="#111" strokeWidth="0.5" fill="white" />
                <text x="100" y="285" textAnchor="middle" fontSize="10" fill="#666">Docs</text>
                <rect x="55" y="295" width="70" height="6" rx="2" fill="#e0e0e0" />

                {/* AYA Processing - center */}
                <circle cx="250" cy="200" r="50" stroke="#111" strokeWidth="1" fill="white" />
                <text x="250" y="195" textAnchor="middle" fontSize="14" fill="#111" fontWeight="500">AYA</text>
                <text x="250" y="210" textAnchor="middle" fontSize="9" fill="#666">Intelligence</text>

                {/* Arrows in */}
                <path d="M160 120 L 200 180" stroke="#111" strokeWidth="0.5" markerEnd="url(#arrow)" />
                <path d="M160 210 L 200 200" stroke="#111" strokeWidth="0.5" markerEnd="url(#arrow)" />
                <path d="M160 290 L 200 220" stroke="#111" strokeWidth="0.5" markerEnd="url(#arrow)" />

                {/* Output - right side */}
                <rect x="340" y="80" width="120" height="60" rx="8" stroke="#111" strokeWidth="1" fill="white" />
                <circle cx="360" cy="110" r="8" fill="#111" />
                <text x="380" y="105" fontSize="10" fill="#111" fontWeight="500">Plans</text>
                <rect x="380" y="115" width="60" height="6" rx="2" fill="#e0e0e0" />

                <rect x="340" y="160" width="120" height="60" rx="8" stroke="#111" strokeWidth="1" fill="white" />
                <circle cx="360" cy="190" r="8" fill="#111" />
                <text x="380" y="185" fontSize="10" fill="#111" fontWeight="500">Owners</text>
                <rect x="380" y="195" width="60" height="6" rx="2" fill="#e0e0e0" />

                <rect x="340" y="240" width="120" height="60" rx="8" stroke="#111" strokeWidth="1" fill="white" />
                <circle cx="360" cy="270" r="8" fill="#111" />
                <text x="380" y="265" fontSize="10" fill="#111" fontWeight="500">Outcomes</text>
                <rect x="380" y="275" width="60" height="6" rx="2" fill="#e0e0e0" />

                {/* Arrows out */}
                <path d="M300 180 L 340 110" stroke="#111" strokeWidth="0.5" />
                <path d="M300 200 L 340 190" stroke="#111" strokeWidth="0.5" />
                <path d="M300 220 L 340 270" stroke="#111" strokeWidth="0.5" />

                {/* Arrow marker definition */}
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0,0 6,3 0,6" fill="#111" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            Your AI-powered PMO
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: "Capture Everything",
                description: "Meetings, messages, and documents are automatically processed.",
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: "Extract Action Items",
                description: "AI identifies tasks, decisions, and commitments.",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Assign Owners",
                description: "Tasks are assigned to the right people automatically.",
              },
              {
                icon: <ClipboardList className="w-6 h-6" />,
                title: "Track Progress",
                description: "Status updates, risks, and steering—automated.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-full border border-[#e6e6e6] flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-[#111]/60 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Cadence */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-6">
                Automated operating cadence
              </h2>
              <p className="text-[#111]/60 text-lg mb-8">
                Aya runs your operational rhythm automatically, ensuring nothing falls through the cracks.
              </p>
              <div className="space-y-4">
                {[
                  "Daily status collection from owners",
                  "Weekly progress summaries",
                  "Risk identification and escalation",
                  "Steering committee prep and follow-ups",
                  "Decision tracking and accountability",
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
            <div className="bg-white rounded-2xl border border-[#e6e6e6] p-8">
              <h3 className="font-medium text-lg mb-6">Sample weekly cadence</h3>
              <div className="space-y-4">
                {[
                  { day: "Monday", task: "Status collection from all owners" },
                  { day: "Tuesday", task: "Risk review and escalation" },
                  { day: "Wednesday", task: "Progress summary generation" },
                  { day: "Thursday", task: "Steering prep materials" },
                  { day: "Friday", task: "Week recap and next week planning" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#e6e6e6] last:border-0">
                    <span className="font-medium text-sm">{item.day}</span>
                    <span className="text-[#111]/60 text-sm">{item.task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Let Aya run your meetings
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Transform scattered information into structured execution.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            GET YOUR AI PMO
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
