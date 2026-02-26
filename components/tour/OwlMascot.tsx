"use client";

import { motion } from "framer-motion";

interface OwlMascotProps {
  mood?: "happy" | "wave" | "point";
  size?: number;
}

export function OwlMascot({ mood = "happy", size = 56 }: OwlMascotProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="flex-shrink-0"
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        {/* Body */}
        <ellipse cx="60" cy="70" rx="38" ry="40" fill="url(#owlGradient)" />

        {/* Belly */}
        <ellipse cx="60" cy="78" rx="22" ry="24" fill="#E8EAFF" opacity="0.6" />

        {/* Left eye white */}
        <circle cx="44" cy="55" r="14" fill="white" />
        {/* Right eye white */}
        <circle cx="76" cy="55" r="14" fill="white" />

        {/* Left pupil */}
        <motion.circle
          cx="46"
          cy="56"
          r="7"
          fill="#1E293B"
          animate={mood === "wave" ? { cx: [46, 48, 46] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        {/* Right pupil */}
        <motion.circle
          cx="78"
          cy="56"
          r="7"
          fill="#1E293B"
          animate={mood === "wave" ? { cx: [78, 80, 78] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        {/* Eye shine */}
        <circle cx="43" cy="53" r="3" fill="white" opacity="0.9" />
        <circle cx="75" cy="53" r="3" fill="white" opacity="0.9" />

        {/* Beak */}
        <path d="M55 65 L60 72 L65 65 Z" fill="#F59E0B" />

        {/* Left ear tuft */}
        <path d="M30 38 Q35 20 42 35" fill="url(#owlGradient)" />
        {/* Right ear tuft */}
        <path d="M90 38 Q85 20 78 35" fill="url(#owlGradient)" />

        {/* Left wing */}
        <motion.path
          d="M22 60 Q10 70 18 90 Q22 80 26 75"
          fill="#6366F1"
          opacity="0.7"
          animate={mood === "wave" ? { rotate: [0, -15, 0], originX: "26px", originY: "75px" } : {}}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
        {/* Right wing */}
        <path d="M98 60 Q110 70 102 90 Q98 80 94 75" fill="#6366F1" opacity="0.7" />

        {/* Feet */}
        <ellipse cx="48" cy="108" rx="8" ry="4" fill="#F59E0B" />
        <ellipse cx="72" cy="108" rx="8" ry="4" fill="#F59E0B" />

        {/* Graduation cap */}
        <rect x="38" y="26" width="44" height="4" rx="1" fill="#1E293B" />
        <polygon points="60,12 38,28 82,28" fill="#1E293B" />
        <line x1="80" y1="28" x2="86" y2="40" stroke="#F59E0B" strokeWidth="2" />
        <circle cx="86" cy="42" r="3" fill="#F59E0B" />

        <defs>
          <linearGradient id="owlGradient" x1="22" y1="30" x2="98" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
