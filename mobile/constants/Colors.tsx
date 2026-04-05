import React, { createContext, useContext, ReactNode } from 'react';

// Inspired by shadcn/ui HSL tokens from web version
// Standardized for Safarlink Driver App
export const Colors = {
  light: {
    background: 'hsl(220 20% 97%)',
    foreground: 'hsl(220 30% 12%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(220 30% 12%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(220 30% 12%)',
    primary: 'hsl(217 100% 50%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(217 90% 94%)',
    secondaryForeground: 'hsl(217 80% 25%)',
    muted: 'hsl(220 15% 92%)',
    mutedForeground: 'hsl(220 10% 50%)',
    accent: 'hsl(217 90% 94%)',
    accentForeground: 'hsl(217 80% 25%)',
    destructive: 'hsl(0 72% 55%)',
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(220 15% 90%)',
    input: 'hsl(220 15% 90%)',
    ring: 'hsl(217 100% 50%)',
    success: 'hsl(152 60% 42%)',
    warning: 'hsl(38 92% 50%)',
    danger: 'hsl(0 72% 55%)',
  },
  dark: {
    background: 'hsl(220 25% 8%)',
    foreground: 'hsl(220 15% 92%)',
    card: 'hsl(220 25% 11%)',
    cardForeground: 'hsl(220 15% 92%)',
    popover: 'hsl(220 25% 11%)',
    popoverForeground: 'hsl(220 15% 92%)',
    primary: 'hsl(217 100% 58%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(217 40% 20%)',
    secondaryForeground: 'hsl(217 80% 85%)',
    muted: 'hsl(220 20% 16%)',
    mutedForeground: 'hsl(220 10% 55%)',
    accent: 'hsl(217 40% 20%)',
    accentForeground: 'hsl(220 15% 92%)',
    destructive: 'hsl(0 62.8% 30.6%)',
    destructiveForeground: 'hsl(210 40% 98%)',
    border: 'hsl(220 20% 18%)',
    input: 'hsl(220 20% 18%)',
    ring: 'hsl(217 100% 58%)',
    success: 'hsl(152 60% 42%)',
    warning: 'hsl(38 92% 50%)',
    danger: 'hsl(0 62.8% 30.6%)',
  }
};

type ThemeContextType = {
  colors: typeof Colors.light;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Can be expanded to follow system theme
  const isDark = false; 
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export default Colors;
