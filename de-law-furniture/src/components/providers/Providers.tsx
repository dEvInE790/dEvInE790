"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { IntroProvider } from "./IntroProvider";
import { SmoothScroll } from "./SmoothScroll";
import { PageTransitionProvider } from "./PageTransition";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <IntroProvider>
        <SmoothScroll>
          <PageTransitionProvider>{children}</PageTransitionProvider>
        </SmoothScroll>
      </IntroProvider>
    </MotionConfig>
  );
}
