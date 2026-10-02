const storageKey = "jaad_erp_simulation_v2";
const legacyStorageKey = "jaad_erp_simulation_v1";
let latestObservedSave = 0;
let lastPersistedData = "";

type Snapshot = {
  version: 2;
  savedAt: number;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function restoreSimulationState<T extends object>(target: T) {
  try {
    const currentSnapshot = localStorage.getItem(storageKey);
    const legacySnapshot = currentSnapshot ? null : localStorage.getItem(legacyStorageKey);
    const parsed = JSON.parse(currentSnapshot || legacySnapshot || "null") as { version?: number; savedAt?: number; data?: unknown } | null;
    const snapshot: Snapshot | null = parsed && (parsed.version === 1 || parsed.version === 2) && typeof parsed.savedAt === "number"
      ? { version: 2, savedAt: parsed.savedAt, data: parsed.data as Record<string, unknown> }
      : null;
    const data = asRecord(snapshot?.data);
    if (snapshot?.version !== 2 || !data) {
      lastPersistedData = JSON.stringify(target);
      return false;
    }
    if (legacySnapshot && !currentSnapshot) localStorage.setItem(storageKey, JSON.stringify(snapshot));
    if (snapshot.savedAt < latestObservedSave) return false;
    latestObservedSave = snapshot.savedAt;

    const current = target as Record<string, unknown>;
    Object.keys(current).forEach((key) => {
      if (!(key in data)) return;
      const existingValue = current[key];
      const savedValue = data[key];
      if (Array.isArray(existingValue) && Array.isArray(savedValue)) {
        existingValue.splice(0, existingValue.length, ...savedValue);
      } else {
        const existingRecord = asRecord(existingValue);
        const savedRecord = asRecord(savedValue);
        if (existingRecord && savedRecord) {
          Object.assign(existingRecord, savedRecord);
          return;
        }
        if (typeof existingValue === typeof savedValue) current[key] = savedValue;
      }
    });
    lastPersistedData = JSON.stringify(target);
    return true;
  } catch {
    try { lastPersistedData = JSON.stringify(target); } catch { lastPersistedData = ""; }
    return false;
  }
}

export function persistSimulationState(data: object) {
  try {
    const serializedData = JSON.stringify(data);
    if (serializedData === lastPersistedData) return false;

    const stored = JSON.parse(localStorage.getItem(storageKey) || "null") as Snapshot | null;
    if (stored?.version === 2 && stored.savedAt > latestObservedSave) return false;

    const snapshot: Snapshot = {
      version: 2,
      savedAt: Date.now(),
      data: JSON.parse(serializedData) as Record<string, unknown>,
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
    latestObservedSave = snapshot.savedAt;
    lastPersistedData = serializedData;
    return true;
  } catch {
    // Simulation remains usable in memory if local storage is full or unavailable.
    return false;
  }
}
