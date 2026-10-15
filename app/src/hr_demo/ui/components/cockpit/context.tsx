import { createContext, useContext } from "react";
import type { CockpitData, Language, Persona } from "@/lib/cockpit-types";

export interface DemoPreferences {
  language: Language;
  setLanguage: (language: Language) => void;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  t: (fr: string, en: string) => string;
  openSources: (metric?: string) => void;
  startTour: () => void;
  openAssistant: () => void;
}
export const PreferencesContext = createContext<DemoPreferences | null>(null);
export const CockpitContext = createContext<CockpitData | null>(null);
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Demo preferences are unavailable");
  return value;
}
export function useCockpit() {
  const value = useContext(CockpitContext);
  if (!value) throw new Error("Cockpit response is unavailable");
  return value;
}
