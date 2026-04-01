import { useState } from "react";
import type { Member } from "@shared/schema";

// Simple hook to manage "current member" selection in state.
// This simulates a logged-in user — selected via the admin page.
let globalMemberId: number | null = null;
const listeners = new Set<() => void>();

export function setCurrentMemberId(id: number | null) {
  globalMemberId = id;
  listeners.forEach((fn) => fn());
}

export function getCurrentMemberId(): number | null {
  return globalMemberId;
}

export function useCurrentMemberId(): [number | null, (id: number | null) => void] {
  const [, forceUpdate] = useState(0);

  // Register this component so it re-renders on change
  const listener = () => forceUpdate((n) => n + 1);
  listeners.add(listener);

  return [globalMemberId, setCurrentMemberId];
}
