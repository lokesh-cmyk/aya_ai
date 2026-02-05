"use client";

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Building2, Users } from 'lucide-react';
import Link from 'next/link';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

// AYA Logo
const AyaLogo = () => (
  <Link href="/" className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-full border border-[#111] flex items-center justify-center">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
    <span className="text-base font-medium tracking-tight">AYA</span>
  </Link>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignUpPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignUp?: (data: {
    name: string;
    email: string;
    password: string;
    teamName?: string;
    teamCode?: string;
    joinTeam: boolean;
  }) => Promise<void>;
  onGoogleSignUp?: (teamCode?: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  showGoogleButton?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-[#e6e6e6] bg-white/50 backdrop-blur-sm transition-colors focus-within:border-[#111]/50 focus-within:bg-white">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#e6e6e6] p-4 w-56 shadow-sm`}>
    <img src={testimonial.avatarSrc} className="h-9 w-9 object-cover rounded-xl" alt="avatar" />
    <div className="text-xs leading-snug">
      <p className="font-medium text-[#111]">{testimonial.name}</p>
      <p className="text-[#111]/50">{testimonial.handle}</p>
      <p className="mt-1 text-[#111]/80 line-clamp-2">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignUpPage: React.FC<SignUpPageProps> = ({
  title = <span className="font-normal text-[#111] tracking-tight">Create account</span>,
  description = "Get started with AYA today",
  heroImageSrc,
  testimonials = [],
  onSignUp,
  onGoogleSignUp,
  isLoading = false,
  error,
  showGoogleButton = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [joinTeam, setJoinTeam] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showTeamCodeInput, setShowTeamCodeInput] = useState(false);
  const [preOAuthCode, setPreOAuthCode] = useState("");

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSignUp) {
      await onSignUp({
        name,
        email,
        password,
        teamName: joinTeam ? undefined : teamName,
        teamCode: joinTeam ? teamCode : undefined,
        joinTeam,
      });
    }
  };

  const handleGoogleClick = async () => {
    if (onGoogleSignUp) {
      await onGoogleSignUp(preOAuthCode.trim() || undefined);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row w-full overflow-hidden" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left column: sign-up form */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-5 animate-element animate-delay-100">
            <AyaLogo />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h1 className="animate-element animate-delay-100 text-2xl font-normal leading-tight tracking-tight">{title}</h1>
              <p className="animate-element animate-delay-200 text-sm text-[#111]/60 mt-1">{description}</p>
            </div>

            {error && (
              <div className="animate-element p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              {/* Name and Email in a row on larger screens */}
              <div className="grid grid-cols-2 gap-3">
                <div className="animate-element animate-delay-300">
                  <label className="text-xs font-medium text-[#111]/60 mb-1 block">Full Name</label>
                  <GlassInputWrapper>
                    <input
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full bg-transparent text-sm p-3 rounded-xl focus:outline-none text-[#111] placeholder:text-[#111]/40"
                    />
                  </GlassInputWrapper>
                </div>

                <div className="animate-element animate-delay-300">
                  <label className="text-xs font-medium text-[#111]/60 mb-1 block">Email</label>
                  <GlassInputWrapper>
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full bg-transparent text-sm p-3 rounded-xl focus:outline-none text-[#111] placeholder:text-[#111]/40"
                    />
                  </GlassInputWrapper>
                </div>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-xs font-medium text-[#111]/60 mb-1 block">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="w-full bg-transparent text-sm p-3 pr-10 rounded-xl focus:outline-none text-[#111] placeholder:text-[#111]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-2 flex items-center"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-[#111]/40 hover:text-[#111] transition-colors" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#111]/40 hover:text-[#111] transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
                {password && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-[#e6e6e6] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${
                      passwordStrength <= 2 ? "text-red-600" :
                      passwordStrength <= 4 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {passwordStrength <= 2 ? "Weak" : passwordStrength <= 4 ? "Medium" : "Strong"}
                    </span>
                  </div>
                )}
              </div>

              {/* Organization Section - Compact */}
              <div className="animate-element animate-delay-500 space-y-2 pt-3 border-t border-[#e6e6e6]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#111]">Organization</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setJoinTeam(false); setTeamCode(""); }}
                      disabled={isLoading}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        !joinTeam ? "bg-[#111] text-white" : "bg-[#f5f5f5] text-[#111] hover:bg-[#e6e6e6]"
                      }`}
                    >
                      <Building2 className="w-3 h-3 inline mr-1" />
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => { setJoinTeam(true); setTeamName(""); }}
                      disabled={isLoading}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        joinTeam ? "bg-[#111] text-white" : "bg-[#f5f5f5] text-[#111] hover:bg-[#e6e6e6]"
                      }`}
                    >
                      <Users className="w-3 h-3 inline mr-1" />
                      Join
                    </button>
                  </div>
                </div>

                <GlassInputWrapper>
                  <input
                    name={joinTeam ? "teamCode" : "teamName"}
                    type="text"
                    placeholder={joinTeam ? "Enter team code (e.g., ABC123)" : "Organization name"}
                    value={joinTeam ? teamCode : teamName}
                    onChange={(e) => joinTeam ? setTeamCode(e.target.value.toUpperCase()) : setTeamName(e.target.value)}
                    required
                    maxLength={joinTeam ? 6 : undefined}
                    disabled={isLoading}
                    className={`w-full bg-transparent text-sm p-3 rounded-xl focus:outline-none text-[#111] placeholder:text-[#111]/40 ${joinTeam ? 'uppercase' : ''}`}
                  />
                </GlassInputWrapper>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="animate-element animate-delay-600 w-full rounded-full bg-[#111] py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {showGoogleButton && (
              <>
                <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                  <span className="w-full border-t border-[#e6e6e6]"></span>
                  <span className="px-3 text-xs text-[#111]/50 bg-white absolute">or</span>
                </div>

                {/* Collapsible team code for Google sign-up */}
                {showTeamCodeInput && (
                  <div className="animate-element p-3 bg-[#f9f9f9] border border-[#e6e6e6] rounded-xl">
                    <GlassInputWrapper>
                      <input
                        type="text"
                        placeholder="Team code (optional)"
                        value={preOAuthCode}
                        onChange={(e) => setPreOAuthCode(e.target.value.toUpperCase())}
                        disabled={isLoading}
                        className="w-full bg-transparent text-sm p-2.5 rounded-xl focus:outline-none text-[#111] placeholder:text-[#111]/40 uppercase"
                        maxLength={6}
                      />
                    </GlassInputWrapper>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={isLoading}
                  className="animate-element animate-delay-800 w-full flex items-center justify-center gap-2 border border-[#e6e6e6] rounded-full py-3 text-sm hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => setShowTeamCodeInput(!showTeamCodeInput)}
                  className="animate-element animate-delay-800 text-xs text-[#111]/50 hover:text-[#111] transition-colors text-center"
                  disabled={isLoading}
                >
                  {showTeamCodeInput ? "Hide team code" : "Have a team invite code?"}
                </button>
              </>
            )}

            <p className="animate-element animate-delay-900 text-center text-xs text-[#111]/60">
              Already have an account?{" "}
              <Link href="/login" className="text-[#111] font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden lg:block flex-1 relative p-3 bg-[#f9f9f9]">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-3 rounded-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          {testimonials.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 px-6 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SignUpPage;
