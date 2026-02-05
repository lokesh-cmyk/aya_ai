"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  className = "",
}: AnimatedNumberProps) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!numberRef.current || hasAnimated) return;

    const element = numberRef.current;

    ScrollTrigger.create({
      trigger: element,
      start: "top 80%",
      once: true,
      onEnter: () => {
        setHasAnimated(true);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value,
          duration: duration,
          ease: "power2.out",
          onUpdate: () => {
            if (numberRef.current) {
              numberRef.current.textContent = `${prefix}${Math.round(obj.val)}${suffix}`;
            }
          },
        });
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [value, suffix, prefix, duration, hasAnimated]);

  return (
    <span ref={numberRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
