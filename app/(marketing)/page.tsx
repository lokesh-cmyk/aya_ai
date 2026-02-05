"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { AnimatedNumber } from "@/components/landing/AnimatedNumber";
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { FadeIn, StaggerChildren } from "@/components/landing/ScrollAnimations";
import { CurrentYear } from "@/components/landing/CurrentYear";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for session cookie on client side
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", { method: "GET" });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            window.location.href = "/dashboard";
          }
        }
      } catch {
        // Not logged in, stay on landing page
      }
    };
    checkAuth();
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: "Smart Inbox",
      subtitle: "Unified Communications across Gmail, LinkedIn, Slack, WhatsApp & Instagram",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
      title: "AI Drafts",
      subtitle: "Intelligent responses that learn your communication style and sound like you",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      ),
      title: "Briefings",
      subtitle: "Daily summaries with prioritized action items and crucial message highlights",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: "Team Chat",
      subtitle: "Real-time collaboration with your team, integrated with all your channels",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111]" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                {/* Logo Icon */}
                <div className="w-8 h-8 rounded-full border border-[#111] flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-lg font-medium tracking-tight">AYA</span>
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="#features" className="hover:opacity-60 transition-opacity">Features</Link>
                <Link href="#how-it-works" className="hover:opacity-60 transition-opacity">About</Link>
                <Link href="/explore" className="hover:opacity-60 transition-opacity">Explore</Link>
                <Link href="#resources" className="hover:opacity-60 transition-opacity">Resources</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm hover:opacity-60 transition-opacity"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-[#111] text-white px-5 py-2 rounded-full hover:bg-[#333] transition-colors"
              >
                Join AYA
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          {/* Announcement Badge */}
          <FadeIn delay={0}>
            <div className="mb-8">
              <Link href="/explore/meetings" className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-opacity">
                <span className="bg-[#111] text-white text-xs px-2 py-0.5 rounded-full font-medium">NEW</span>
                <span>Introducing AI-powered meeting intelligence</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left: Content */}
            <FadeIn delay={0.1}>
              <div>
                <h1 className="text-[42px] md:text-[52px] lg:text-[60px] font-normal leading-[1.1] tracking-tight mb-8">
                  Communications managed
                  <br />
                  <span className="text-[#111]/40">from the palm of your hand</span>
                </h1>
                <div className="flex items-center gap-4 mb-12">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 bg-[#111] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
                  >
                    JOIN AYA
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-60 transition-opacity"
                  >
                    SEE WHY
                    <Play className="w-4 h-4 fill-current" />
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Right: Illustration */}
            <FadeIn delay={0.2} direction="left">
              <div className="relative">
                {/* Vintage cityscape illustration placeholder - SVG line art */}
                <svg className="w-full h-auto" viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Sky */}
                  <rect width="500" height="350" fill="white"/>

                  {/* Buildings - vintage engraving style */}
                  <g stroke="#111" strokeWidth="0.5" fill="none">
                    {/* Building 1 - Left */}
                    <rect x="20" y="120" width="80" height="230" />
                    {[...Array(10)].map((_, i) => (
                      <g key={`b1-${i}`}>
                        <rect x="30" y={130 + i * 22} width="15" height="18" />
                        <rect x="55" y={130 + i * 22} width="15" height="18" />
                        <rect x="75" y={130 + i * 22} width="15" height="18" />
                      </g>
                    ))}

                    {/* Building 2 */}
                    <rect x="110" y="80" width="70" height="270" />
                    {[...Array(12)].map((_, i) => (
                      <g key={`b2-${i}`}>
                        <rect x="120" y={90 + i * 22} width="12" height="16" />
                        <rect x="140" y={90 + i * 22} width="12" height="16" />
                        <rect x="160" y={90 + i * 22} width="12" height="16" />
                      </g>
                    ))}

                    {/* Building 3 - Tall center */}
                    <rect x="190" y="40" width="60" height="310" />
                    <polygon points="190,40 220,10 250,40" />
                    {[...Array(14)].map((_, i) => (
                      <g key={`b3-${i}`}>
                        <rect x="200" y={50 + i * 21} width="10" height="14" />
                        <rect x="218" y={50 + i * 21} width="10" height="14" />
                        <rect x="236" y={50 + i * 21} width="10" height="14" />
                      </g>
                    ))}

                    {/* Building 4 */}
                    <rect x="260" y="100" width="80" height="250" />
                    {[...Array(11)].map((_, i) => (
                      <g key={`b4-${i}`}>
                        <rect x="270" y={110 + i * 22} width="14" height="16" />
                        <rect x="292" y={110 + i * 22} width="14" height="16" />
                        <rect x="314" y={110 + i * 22} width="14" height="16" />
                      </g>
                    ))}

                    {/* Building 5 - Right */}
                    <rect x="350" y="60" width="70" height="290" />
                    {[...Array(13)].map((_, i) => (
                      <g key={`b5-${i}`}>
                        <rect x="360" y={70 + i * 22} width="12" height="16" />
                        <rect x="380" y={70 + i * 22} width="12" height="16" />
                        <rect x="400" y={70 + i * 22} width="12" height="16" />
                      </g>
                    ))}

                    {/* Building 6 */}
                    <rect x="430" y="140" width="60" height="210" />
                    {[...Array(9)].map((_, i) => (
                      <g key={`b6-${i}`}>
                        <rect x="440" y={150 + i * 22} width="12" height="16" />
                        <rect x="460" y={150 + i * 22} width="12" height="16" />
                        <rect x="478" y={150 + i * 22} width="10" height="16" />
                      </g>
                    ))}
                  </g>

                  {/* Bird */}
                  <g stroke="#111" strokeWidth="0.8" fill="none">
                    <path d="M380 80 Q 395 70 410 80 Q 400 75 390 80 Q 385 78 380 80" />
                    <path d="M390 78 L 395 82" />
                  </g>

                  {/* Ground line */}
                  <line x1="0" y1="350" x2="500" y2="350" stroke="#111" strokeWidth="0.5" />
                </svg>
              </div>
            </FadeIn>
          </div>

          {/* Bottom Stats with Animated Numbers */}
          <FadeIn delay={0.3}>
            <div className="border-t border-[#e6e6e6] pt-8 mt-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <p className="text-[#111]/60 text-sm mb-1">The modern inbox,</p>
                  <p className="text-[#111]/60 text-sm">built for the age of AI</p>
                </div>
                <div className="lg:border-l lg:border-[#e6e6e6] lg:pl-8">
                  <p className="text-xs text-[#111]/50 uppercase tracking-wider mb-1">Channels Unified</p>
                  <p className="text-[32px] font-normal tracking-tight">
                    <AnimatedNumber value={5} suffix="+" />
                  </p>
                </div>
                <div className="lg:border-l lg:border-[#e6e6e6] lg:pl-8">
                  <p className="text-xs text-[#111]/50 uppercase tracking-wider mb-1">Response Time</p>
                  <p className="text-[32px] font-normal tracking-tight">
                    <AnimatedNumber value={5} suffix="x faster" />
                  </p>
                </div>
                <div className="lg:border-l lg:border-[#e6e6e6] lg:pl-8">
                  <p className="text-xs text-[#111]/50 uppercase tracking-wider mb-1">Time Saved</p>
                  <p className="text-[32px] font-normal tracking-tight">
                    <AnimatedNumber value={90} suffix="%" />
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Vertical Line Separator */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="h-px bg-[#e6e6e6]" />
      </div>

      {/* Our Difference Section */}
      <section id="features" className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left: Title */}
            <FadeIn>
              <div>
                <p className="text-xs text-[#8B4513] uppercase tracking-widest mb-4 font-medium">OUR DIFFERENCE</p>
                <h2 className="text-[32px] md:text-[40px] font-normal leading-[1.2] tracking-tight">
                  Service you'd expect from a personal assistant
                  <span className="text-[#111]/40">—seamless, available, and intelligent</span>
                </h2>
              </div>
            </FadeIn>

            {/* Right: Features List */}
            <StaggerChildren stagger={0.1} className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-[#e6e6e6] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <p className="text-lg leading-relaxed">All your channels in one unified inbox—Gmail, LinkedIn, Slack, WhatsApp & Instagram.</p>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-[#e6e6e6] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <p className="text-lg leading-relaxed">AI that learns your communication style and drafts replies that sound like you.</p>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-[#e6e6e6] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-lg leading-relaxed">Morning briefings that summarize crucial messages and prioritize your action items.</p>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full border border-[#e6e6e6] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-lg leading-relaxed">"One tap" access to all your conversations with 360° visibility.</p>
              </div>
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12">
          <FadeIn>
            <h2 className="text-[32px] md:text-[44px] font-normal leading-[1.2] tracking-tight text-center mb-12">
              Seamlessly handling high-stakes communications{" "}
              <span className="text-[#111]/40">for our users</span>
            </h2>
          </FadeIn>

          {/* Video Card */}
          <FadeIn delay={0.2}>
            <div className="relative rounded-2xl overflow-hidden bg-[#f5f5f5] aspect-video">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23f5f5f5' width='1920' height='1080'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='48' font-family='system-ui'%3EAYA Demo%3C/text%3E%3C/svg%3E"
              >
                {/* Placeholder - in production you'd add actual video source */}
              </video>
              {/* Play button overlay for when video doesn't autoplay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-6 h-6 fill-[#111] text-[#111] ml-1" />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Dark Section - Offerings with Carousel */}
      <section id="how-it-works" className="py-24 bg-[#111] text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: Content */}
            <FadeIn direction="right">
              <div>
                <h2 className="text-[32px] md:text-[44px] font-normal leading-[1.2] tracking-tight mb-4">
                  Award-winning platform,
                  <br />
                  <span className="text-white/40">built to simplify work</span>
                </h2>
                <p className="text-white/60 text-lg mb-8">
                  We've built proprietary AI features across communication channels.
                </p>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white hover:text-[#111] transition-colors"
                >
                  SEE ALL FEATURES
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeIn>

            {/* Right: Feature Carousel */}
            <FadeIn direction="left" delay={0.2}>
              <FeatureCarousel features={features} />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* New Section: Meeting Intelligence */}
      <section className="py-24 border-b border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <p className="text-xs text-[#8B4513] uppercase tracking-widest mb-4 font-medium">MEETING INTELLIGENCE</p>
                <h2 className="text-[32px] md:text-[44px] font-normal leading-[1.2] tracking-tight mb-6">
                  From meetings to outcomes
                  <span className="text-[#111]/40">—automatically</span>
                </h2>
                <p className="text-[#111]/60 text-lg mb-8">
                  Aya turns meetings, messages, and docs into plans, owners, and outcomes—then runs the operating cadence (status, risks, steering) like a lightweight PMO.
                </p>
                <Link
                  href="/explore/meetings"
                  className="inline-flex items-center gap-2 border border-[#111] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#111] hover:text-white transition-colors"
                >
                  LEARN MORE
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={0.2}>
              <div className="bg-[#f9f9f9] rounded-2xl p-8 border border-[#e6e6e6]">
                <div className="space-y-4">
                  {[
                    { label: "Meetings", icon: "📅", arrow: true },
                    { label: "Messages", icon: "💬", arrow: true },
                    { label: "Documents", icon: "📄", arrow: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[#e6e6e6] flex items-center justify-center text-xl">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {item.arrow && <ArrowRight className="w-4 h-4 text-[#111]/40 ml-auto" />}
                    </div>
                  ))}
                </div>
                <div className="my-6 flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">AYA</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Plans & Tasks", color: "bg-green-100" },
                    { label: "Assigned Owners", color: "bg-blue-100" },
                    { label: "Tracked Outcomes", color: "bg-purple-100" },
                  ].map((item, i) => (
                    <div key={i} className={`${item.color} rounded-xl p-4 text-center font-medium`}>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* New Section: WhatsApp Recaps */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-2 lg:order-1">
              <div className="flex justify-center">
                {/* WhatsApp Phone Mockup */}
                <div className="w-[260px] h-[480px] bg-[#111] rounded-[36px] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[28px] overflow-hidden">
                    <div className="h-7 bg-[#075E54] flex items-center justify-center">
                      <span className="text-white text-xs">WhatsApp</span>
                    </div>
                    <div className="h-12 bg-[#075E54] flex items-center px-3 gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">A</span>
                      </div>
                      <span className="text-white font-medium text-sm">AYA AI</span>
                    </div>
                    <div className="p-2 space-y-2 bg-[#ECE5DD] h-full">
                      <div className="bg-white rounded-lg p-2 max-w-[180px] shadow-sm">
                        <p className="text-[10px] font-medium text-[#075E54] mb-1">Weekly Recap</p>
                        <p className="text-xs text-[#111] mb-2">3 items need attention</p>
                        <div className="space-y-1">
                          <button className="w-full py-1.5 px-2 bg-[#25D366] text-white text-[10px] rounded">
                            Approve Q4 Budget
                          </button>
                          <button className="w-full py-1.5 px-2 bg-[#f0f0f0] text-[#111] text-[10px] rounded">
                            View Dashboard
                          </button>
                        </div>
                      </div>
                      <div className="bg-[#DCF8C6] rounded-lg p-2 max-w-[120px] ml-auto shadow-sm">
                        <p className="text-xs text-[#111]">Approved!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn className="order-1 lg:order-2">
              <div>
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30">
                  <span className="text-[#25D366] text-xs font-medium">WhatsApp-First</span>
                </div>
                <h2 className="text-[32px] md:text-[44px] font-normal leading-[1.2] tracking-tight mb-6">
                  Executive recaps,
                  <span className="text-[#111]/40"> delivered where you are</span>
                </h2>
                <p className="text-[#111]/60 text-lg mb-8">
                  Aya delivers daily and weekly WhatsApp recaps to execs and owners, with one-tap actions, plus a web executive dashboard for drill-downs and approvals.
                </p>
                <Link
                  href="/explore/whatsapp"
                  className="inline-flex items-center gap-2 border border-[#111] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#111] hover:text-white transition-colors"
                >
                  LEARN MORE
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <FadeIn>
            <h2 className="text-[32px] md:text-[44px] font-normal leading-[1.2] tracking-tight text-center mb-4">
              We helped a startup founder
              <br />
              <span className="text-[#111]/40">turn inbox chaos into organized clarity</span>
            </h2>
            <p className="text-center text-[#111]/60 max-w-2xl mx-auto mb-8">
              She was managing five different messaging platforms with hundreds of daily messages.
            </p>
            <div className="text-center mb-16">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 border border-[#111] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#111] hover:text-white transition-colors"
              >
                HOW WE HELP PROFESSIONALS
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>

          {/* Persona Cards */}
          <StaggerChildren stagger={0.15} className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#e6e6e6] p-6 hover:border-[#111]/30 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-medium text-lg">Sarah</h3>
                  <p className="text-sm text-[#111]/50">Startup Founder</p>
                </div>
                {/* Vintage portrait illustration */}
                <div className="w-14 h-14 rounded-full border-2 border-[#d4a574] overflow-hidden bg-[#f9f6f2]">
                  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="22" r="10" stroke="#111" strokeWidth="0.5" fill="none" />
                    <path d="M28 32 C 16 32, 10 44, 10 56 L 46 56 C 46 44, 40 32, 28 32" stroke="#111" strokeWidth="0.5" fill="none" />
                    <path d="M18 20 Q 28 12, 38 20" stroke="#111" strokeWidth="0.5" fill="none" />
                  </svg>
                </div>
              </div>
              <p className="text-[#111]/70 text-sm">Inbox Unification</p>
            </div>

            <div className="rounded-2xl border border-[#e6e6e6] p-6 hover:border-[#111]/30 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-medium text-lg">Marcus</h3>
                  <p className="text-sm text-[#111]/50">Sales Executive</p>
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-[#d4a574] overflow-hidden bg-[#f9f6f2]">
                  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="22" r="10" stroke="#111" strokeWidth="0.5" fill="none" />
                    <path d="M28 32 C 16 32, 10 44, 10 56 L 46 56 C 46 44, 40 32, 28 32" stroke="#111" strokeWidth="0.5" fill="none" />
                    <rect x="22" y="18" width="12" height="2" stroke="#111" strokeWidth="0.3" fill="none" />
                  </svg>
                </div>
              </div>
              <p className="text-[#111]/70 text-sm">Response Automation</p>
            </div>

            <div className="rounded-2xl border border-[#e6e6e6] p-6 hover:border-[#111]/30 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-medium text-lg">Elena</h3>
                  <p className="text-sm text-[#111]/50">Product Manager</p>
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-[#d4a574] overflow-hidden bg-[#f9f6f2]">
                  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="22" r="10" stroke="#111" strokeWidth="0.5" fill="none" />
                    <path d="M28 32 C 16 32, 10 44, 10 56 L 46 56 C 46 44, 40 32, 28 32" stroke="#111" strokeWidth="0.5" fill="none" />
                    <path d="M20 16 Q 28 8, 36 16 Q 38 24, 28 26 Q 18 24, 20 16" stroke="#111" strokeWidth="0.5" fill="none" />
                  </svg>
                </div>
              </div>
              <p className="text-[#111]/70 text-sm">Priority Management</p>
            </div>
          </StaggerChildren>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-24 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <FadeIn>
            <h2 className="text-[32px] md:text-[40px] font-normal leading-tight tracking-tight mb-12">
              Our Thinking
            </h2>
          </FadeIn>

          <StaggerChildren stagger={0.1} className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Resource Card 1 */}
            <div className="rounded-2xl border border-[#e6e6e6] p-8 hover:border-[#111]/30 transition-colors group cursor-pointer">
              <div className="h-40 flex items-center justify-center mb-6">
                {/* Vintage illustration - Temple/Building */}
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" stroke="#111" strokeWidth="0.5">
                  <rect x="20" y="60" width="60" height="35" />
                  <rect x="25" y="45" width="50" height="15" />
                  <polygon points="10,60 50,30 90,60" />
                  <line x1="30" y1="60" x2="30" y2="95" />
                  <line x1="40" y1="60" x2="40" y2="95" />
                  <line x1="50" y1="60" x2="50" y2="95" />
                  <line x1="60" y1="60" x2="60" y2="95" />
                  <line x1="70" y1="60" x2="70" y2="95" />
                </svg>
              </div>
              <p className="text-lg font-medium group-hover:underline">The Future of Unified Communications</p>
            </div>

            {/* Resource Card 2 */}
            <div className="rounded-2xl border border-[#e6e6e6] p-8 hover:border-[#111]/30 transition-colors group cursor-pointer">
              <div className="h-40 flex items-center justify-center mb-6">
                {/* Vintage illustration - Vase/Urn */}
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" stroke="#111" strokeWidth="0.5">
                  <path d="M35 20 Q 50 15, 65 20" />
                  <path d="M30 25 L 35 20 L 35 30 Q 35 50, 25 70 L 25 90 L 75 90 L 75 70 Q 65 50, 65 30 L 65 20 L 70 25" />
                  <ellipse cx="50" cy="90" rx="25" ry="5" />
                  <line x1="35" y1="35" x2="65" y2="35" />
                  <line x1="33" y1="45" x2="67" y2="45" />
                </svg>
              </div>
              <p className="text-lg font-medium group-hover:underline">10 Ways to Optimize Your Inbox</p>
            </div>

            {/* Resource Card 3 */}
            <div className="rounded-2xl border border-[#e6e6e6] p-8 hover:border-[#111]/30 transition-colors group cursor-pointer">
              <div className="h-40 flex items-center justify-center mb-6">
                {/* Vintage illustration - Lighthouse */}
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" stroke="#111" strokeWidth="0.5">
                  <path d="M40 95 L 45 40 L 55 40 L 60 95" />
                  <rect x="43" y="30" width="14" height="10" />
                  <polygon points="43,30 50,15 57,30" />
                  <ellipse cx="50" cy="22" rx="8" ry="3" />
                  {[...Array(5)].map((_, i) => (
                    <line key={i} x1={46} y1={50 + i * 10} x2={54} y2={50 + i * 10} />
                  ))}
                  <path d="M20 95 Q 50 85, 80 95" />
                </svg>
              </div>
              <p className="text-lg font-medium group-hover:underline">AI-Powered Productivity Guide</p>
            </div>
          </StaggerChildren>

          <FadeIn>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 border border-[#111] px-6 py-3 rounded-full text-sm font-medium hover:bg-[#111] hover:text-white transition-colors"
            >
              EXPLORE RESOURCES
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#111] text-white">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center">
          <FadeIn>
            <h2 className="text-[36px] md:text-[52px] font-normal leading-[1.1] tracking-tight mb-6">
              Ready to unify your inbox?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
              Join professionals who use AYA to stay on top of every conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#111] px-8 py-4 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
              >
                BECOME A USER
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#e6e6e6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full border border-[#111] flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-lg font-medium tracking-tight">AYA</span>
              </Link>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Features</h4>
              <ul className="space-y-2 text-sm text-[#111]/60">
                <li><Link href="/explore/smart-inbox" className="hover:text-[#111] transition-colors">Smart Inbox</Link></li>
                <li><Link href="/explore/ai-drafts" className="hover:text-[#111] transition-colors">AI Drafts</Link></li>
                <li><Link href="/explore/briefings" className="hover:text-[#111] transition-colors">Briefings</Link></li>
                <li><Link href="/explore/team-chat" className="hover:text-[#111] transition-colors">Team Chat</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-[#111]/60">
                <li><Link href="#" className="hover:text-[#111] transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-[#111] transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-[#111] transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-[#111] transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-[#111]/60">
                <li><Link href="#" className="hover:text-[#111] transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-[#111] transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-[#111] transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#e6e6e6] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#111]/50">
              © <CurrentYear /> AYA. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-[#111]/50 hover:text-[#111] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link href="#" className="text-[#111]/50 hover:text-[#111] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
