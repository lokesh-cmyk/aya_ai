"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface TemplateProps {
  children: ReactNode;
}

export default function AuthTemplate({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: [0.2, 0, 0, 1],
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
