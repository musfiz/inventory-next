'use client';

import { createContext, useContext } from 'react';

export type StorefrontTheme = 'default' | 'grocery';

interface ThemeContextValue {
  theme: StorefrontTheme;
  isDefault: boolean;
  isGrocery: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'default',
  isDefault: true,
  isGrocery: false,
});

export function useStorefrontTheme() {
  return useContext(ThemeContext);
}

export { ThemeContext };
