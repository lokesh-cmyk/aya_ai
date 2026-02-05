"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
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
    <div className="w-8 h-8 rounded-full border border-[#111] flex items-center justify-center">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
    <span className="text-lg font-medium tracking-tight">AYA</span>
  </Link>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (email: string, password: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isLoading?: boolean;
  error?: string;
  showGoogleButton?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#e6e6e6] bg-white/50 backdrop-blur-sm transition-colors focus-within:border-[#111]/50 focus-within:bg-white">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-white/90 backdrop-blur-xl border border-[#e6e6e6] p-5 w-64 shadow-sm`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-[#111]">{testimonial.name}</p>
      <p className="text-[#111]/50">{testimonial.handle}</p>
      <p className="mt-1 text-[#111]/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-normal text-[#111] tracking-tight">Welcome back</span>,
  description = "Sign in to your account to continue your journey",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isLoading = false,
  error,
  showGoogleButton = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSignIn) {
      await onSignIn(email, password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left column: sign-in form */}
      <section className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12 animate-element animate-delay-100">
            <AyaLogo />
          </div>

          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-[42px] md:text-[48px] font-normal leading-[1.1] tracking-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-[#111]/60">{description}</p>

            {error && (
              <div className="animate-element p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-[#111]/60 mb-2 block">Email Address</label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-[#111] placeholder:text-[#111]/40"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-[#111]/60 mb-2 block">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-[#111] placeholder:text-[#111]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-[#111]/40 hover:text-[#111] transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-[#111]/40 hover:text-[#111] transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="w-4 h-4 rounded border-[#e6e6e6] text-[#111] focus:ring-[#111]"
                  />
                  <span className="text-[#111]/90">Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="text-[#111] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="animate-element animate-delay-600 w-full rounded-full bg-[#111] py-4 font-medium text-white hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {showGoogleButton && (
              <>
                <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                  <span className="w-full border-t border-[#e6e6e6]"></span>
                  <span className="px-4 text-sm text-[#111]/50 bg-white absolute whitespace-nowrap">Or continue with</span>
                </div>

                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                  className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-[#e6e6e6] rounded-full py-4 hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </>
            )}

            <p className="animate-element animate-delay-900 text-center text-sm text-[#111]/60">
              New to AYA?{" "}
              <Link href="/signup" className="text-[#111] font-medium hover:underline transition-colors">
                Create Account
              </Link>
            </p>

            <div className="animate-element animate-delay-900 pt-4 border-t border-[#e6e6e6]">
              <Link href="/" className="text-sm text-[#111]/60 hover:text-[#111] transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4 bg-[#f9f9f9]">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SignInPage;
