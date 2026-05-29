import { useCallback } from "react";
import type { StopSignalType } from "@shared/schema";

export function useQualitySignal() {
  const fireSignal = useCallback(async (
    stopId: string,
    signalType: StopSignalType,
    opts?: { signalValue?: string; signalReason?: string },
  ): Promise<void> => {
    try {
      await fetch(`/api/travel/stops/${stopId}/quality-signal`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Adventure-Parent": "1",
        },
        body: JSON.stringify({
          signalType,
          signalValue: opts?.signalValue ?? null,
          signalReason: opts?.signalReason ?? null,
        }),
      });
    } catch {
      // Fire-and-forget — never throw to caller
    }
  }, []);

  return { fireSignal };
}
