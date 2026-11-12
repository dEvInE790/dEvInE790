"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type IntroState = { introDone: boolean; setIntroDone: (v: boolean) => void };

const IntroContext = createContext<IntroState>({ introDone: true, setIntroDone: () => {} });

/** Lets page heroes wait until the opening loader has finished before animating in. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const [introDone, setIntroDone] = useState(false);
  return <IntroContext.Provider value={{ introDone, setIntroDone }}>{children}</IntroContext.Provider>;
}

export const useIntro = () => useContext(IntroContext);
