import { createContext, useContext, useEffect, useState } from "react";

type Mode = "dark" | "light";

export type ColorTheme = "cyberpunk" | "ocean" | "sunset" | "forest" | "minimal" | "lavender";

export const COLOR_THEMES: { id: ColorTheme; label: string; preview: [string, string, string] }[] = [
  { id: "cyberpunk", label: "Cyberpunk", preview: ["#00d4aa", "#a855f7", "#0a0e1a"] },
  { id: "ocean", label: "Ocean", preview: ["#3b82f6", "#06b6d4", "#0c1929"] },
  { id: "sunset", label: "Sunset", preview: ["#f97316", "#ec4899", "#1a0f0a"] },
  { id: "forest", label: "Forest", preview: ["#22c55e", "#a3e635", "#0a1a0f"] },
  { id: "minimal", label: "Minimal", preview: ["#6b7280", "#9ca3af", "#111111"] },
  { id: "lavender", label: "Lavender", preview: ["#a78bfa", "#f472b6", "#150f1e"] },
];

interface ThemeContextType {
  mode: Mode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setColorTheme: (t: ColorTheme) => void;
  // backwards compat
  theme: Mode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  colorTheme: "cyberpunk",
  toggleMode: () => {},
  setColorTheme: () => {},
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Mode;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = "dark",
  storageKey = "powerflow-theme",
}: ThemeProviderProps) => {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(storageKey) as Mode) || defaultTheme
  );
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    () => (localStorage.getItem("powerflow-color-theme") as ColorTheme) || "cyberpunk"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    COLOR_THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    if (colorTheme !== "cyberpunk") {
      root.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem("powerflow-color-theme", colorTheme);
  }, [colorTheme]);

  const toggleMode = () => setMode((t) => (t === "dark" ? "light" : "dark"));

  const setColorTheme = (t: ColorTheme) => setColorThemeState(t);

  return (
    <ThemeContext.Provider value={{
      mode, colorTheme, toggleMode, setColorTheme,
      theme: mode, toggleTheme: toggleMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
