import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

// Mirrors a useState value into localStorage. Returns [value, set, isHydrated];
// gate side effects that depend on the stored value on isHydrated.
export function usePersistedState<T extends string>(
  storageKey: string,
  defaultValue: T,
  validValues: readonly T[]
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (
        stored != null &&
        (validValues as readonly string[]).includes(stored)
      ) {
        setValue(stored as T);
      }
    } catch {
      /* localStorage unavailable */
    }
    setIsHydrated(true);
  }, [storageKey, validValues]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      /* localStorage unavailable */
    }
  }, [storageKey, value, isHydrated]);

  return [value, setValue, isHydrated];
}
