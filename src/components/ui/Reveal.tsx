"use client";

import { motion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Fade + rise entrance, staggered via the `delay` prop for sequential reveals. */
export default function Reveal({ children, delay = 0, className, style }: RevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.19, 0.91, 0.38, 1] }}
    >
      {children}
    </motion.div>
  );
}
