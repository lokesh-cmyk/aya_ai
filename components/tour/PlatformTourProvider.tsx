"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour-styles.css";
import { TOUR_STEPS } from "./tour-steps";

interface TourContextValue {
  startTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isActive: false,
});

export const useTour = () => useContext(TourContext);

const STORAGE_KEY = "platform-tour-completed";

export function PlatformTourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);

  useEffect(() => {
    const d = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 12,
      popoverOffset: 12,
      showButtons: ["next", "previous"],
      nextBtnText: "Next \u2192",
      prevBtnText: "\u2190 Back",
      doneBtnText: "Finish!",
      progressText: "{{current}} of {{total}}",
      popoverClass: "aya-tour-popover",
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsActive(false);
        d.destroy();
      },
    });
    setDriverInstance(d);
    return () => d.destroy();
  }, []);

  const startTour = useCallback(() => {
    if (driverInstance) {
      setIsActive(true);
      driverInstance.drive();
    }
  }, [driverInstance]);

  // Auto-trigger after onboarding (check URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "start") {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed !== "true") {
        // Small delay to let dashboard render
        const timer = setTimeout(() => startTour(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [startTour]);

  return (
    <TourContext.Provider value={{ startTour, isActive }}>
      {children}
    </TourContext.Provider>
  );
}
