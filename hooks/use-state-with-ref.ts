'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * State whose latest value is also readable from a ref.
 *
 * The studio reads its session configuration at event time (to build the next
 * passage) from callbacks that run in the same tick as the UI writes it. React
 * state is not readable until the next render, so those callbacks used to read
 * the *previous* value: picking "Words" and immediately starting a test served
 * the previous category's passage, and picking 100 words served the previous
 * count. Mirroring every write into a ref removes the whole class of bug without
 * callers having to remember to keep anything in sync.
 */
export function useStateWithRef<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  const ref = useRef<T>(initial);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    if (typeof next === 'function') {
      setValue((prev) => {
        const resolved = (next as (prev: T) => T)(prev);
        ref.current = resolved;
        return resolved;
      });
      return;
    }
    ref.current = next;
    setValue(next);
  }, []);

  return [value, set, ref] as const;
}
