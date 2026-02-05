"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface TemplateProps {
  children: ReactNode;
}

export default function MarketingTemplate({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.2, 0, 0, 1],
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
