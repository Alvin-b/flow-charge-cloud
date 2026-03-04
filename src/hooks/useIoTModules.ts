import { useState, useCallback, useEffect } from "react";
import type { ModuleId } from "@/lib/iot-modules";

const STORAGE_KEY = "powerflow-iot-modules";
const DEFAULT_ENABLED: ModuleId[] = ["energy_meters"];

export function useIoTModules() {
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ENABLED;
    } catch {
      return DEFAULT_ENABLED;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledModules));
  }, [enabledModules]);

  const toggleModule = useCallback((id: ModuleId) => {
    // Can't disable core modules
    if (id === "energy_meters") return;
    setEnabledModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }, []);

  const isEnabled = useCallback(
    (id: ModuleId) => enabledModules.includes(id),
    [enabledModules]
  );

  return { enabledModules, toggleModule, isEnabled };
}
