"use client";

import { useState, useEffect } from "react";

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) return <>2025</>;
  return <>{year}</>;
}
