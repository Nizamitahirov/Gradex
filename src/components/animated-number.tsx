"use client";

import * as React from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

/** Animated count-up for computed grades/scores (SPEC.md §4.5). */
export function AnimatedNumber({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 20, mass: 0.4 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  React.useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}
