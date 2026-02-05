"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Sun, Bell, Calendar } from "lucide-react";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function BriefingsPage() {
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
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-[42px] md:text-[56px] font-normal leading-[1.1] tracking-tight mb-6">
                Daily Briefings
                <br />
                <span className="text-[#111]/40">Start Every Day Informed</span>
              </h1>
              <p className="text-xl text-[#111]/60 mb-8">
                Wake up to a curated summary of your most important messages, prioritized action items, and key updates across all channels.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
              >
                GET YOUR BRIEFING
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustration */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="500" height="400" fill="#f9f9f9" rx="16" />
                {/* Sun */}
                <circle cx="400" cy="80" r="30" stroke="#111" strokeWidth="0.5" fill="white" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line
                    key={angle}
                    x1={400 + 40 * Math.cos((angle * Math.PI) / 180)}
                    y1={80 + 40 * Math.sin((angle * Math.PI) / 180)}
                    x2={400 + 50 * Math.cos((angle * Math.PI) / 180)}
                    y2={80 + 50 * Math.sin((angle * Math.PI) / 180)}
                    stroke="#111"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Briefing card */}
                <rect x="100" y="100" width="300" height="240" rx="12" stroke="#111" strokeWidth="1" fill="white" />
                <rect x="120" y="120" width="100" height="16" rx="4" fill="#111" />
                <text x="130" y="133" fontSize="10" fill="white">Morning Briefing</text>
                {/* Priority items */}
                <rect x="120" y="160" width="260" height="40" rx="6" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="0.5" />
                <circle cx="140" cy="180" r="8" fill="#ff4444" />
                <rect x="160" y="172" width="120" height="8" rx="2" fill="#ddd" />
                <rect x="160" y="184" width="80" height="6" rx="2" fill="#eee" />

                <rect x="120" y="210" width="260" height="40" rx="6" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="0.5" />
                <circle cx="140" cy="230" r="8" fill="#ffaa00" />
                <rect x="160" y="222" width="140" height="8" rx="2" fill="#ddd" />
                <rect x="160" y="234" width="100" height="6" rx="2" fill="#eee" />

                <rect x="120" y="260" width="260" height="40" rx="6" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="0.5" />
                <circle cx="140" cy="280" r="8" fill="#44aa44" />
                <rect x="160" y="272" width="100" height="8" rx="2" fill="#ddd" />
                <rect x="160" y="284" width="60" height="6" rx="2" fill="#eee" />

                {/* Stats at bottom */}
                <rect x="120" y="310" width="60" height="20" rx="4" fill="#f0f0f0" />
                <rect x="190" y="310" width="60" height="20" rx="4" fill="#f0f0f0" />
                <rect x="260" y="310" width="60" height="20" rx="4" fill="#f0f0f0" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-12">
            What&apos;s in your briefing
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: <Bell className="w-6 h-6" />,
                title: "Priority Alerts",
                description: "Critical messages that need immediate attention.",
              },
              {
                icon: <Calendar className="w-6 h-6" />,
                title: "Today's Schedule",
                description: "Meetings and deadlines at a glance.",
              },
              {
                icon: <Sun className="w-6 h-6" />,
                title: "Overnight Summary",
                description: "Key messages received while you slept.",
              },
              {
                icon: <Check className="w-6 h-6" />,
                title: "Action Items",
                description: "Tasks extracted from your conversations.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-full border border-[#e6e6e6] flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-[#111]/60 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery options */}
      <section className="py-16 bg-[#f9f9f9]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-normal leading-tight tracking-tight mb-4">
            Delivered how you want
          </h2>
          <p className="text-[#111]/60 text-lg mb-12 max-w-2xl">
            Choose when and how you receive your briefings to fit your workflow.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "In-App Notification",
                description: "See your briefing when you open AYA each morning.",
                time: "When you open the app",
              },
              {
                title: "Email Digest",
                description: "Get a beautifully formatted email summary.",
                time: "6:00 AM local time",
              },
              {
                title: "WhatsApp Message",
                description: "Receive your briefing directly in WhatsApp.",
                time: "Customizable time",
              },
            ].map((option, index) => (
              <div key={index} className="bg-white rounded-2xl border border-[#e6e6e6] p-6">
                <h3 className="font-medium text-lg mb-2">{option.title}</h3>
                <p className="text-[#111]/60 text-sm mb-4">{option.description}</p>
                <p className="text-xs text-[#111]/40 uppercase tracking-wider">{option.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-[36px] md:text-[48px] font-normal leading-[1.1] tracking-tight mb-6">
            Start every day prepared
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Never miss an important message again with AI-powered daily briefings.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            GET YOUR FIRST BRIEFING
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
