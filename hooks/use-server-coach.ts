'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getServerCoachAvailable,
  probeServerCoach,
  subscribeServerCoach,
} from '@/lib/ai-service';

/**
 * Whether this deployment has its own model key (the built-in Gemini route).
 *
 * Call it anywhere a screen needs to say which model will run. The probe is
 * memoised in `ai-service`, so mounting this in several components costs one
 * network request per page load.
 */
export function useServerCoach(): boolean {
  useEffect(() => {
    void probeServerCoach();
  }, []);

  return useSyncExternalStore(subscribeServerCoach, getServerCoachAvailable, () => false);
}
