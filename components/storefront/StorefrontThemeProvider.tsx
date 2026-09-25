'use client';

import { useEffect } from 'react';
import { ThemeContext, type StorefrontTheme } from '@/contexts/storefront-theme-context';
import { useStorefrontSettings } from '@/hooks/use-storefront-status';

export default function StorefrontThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { storefrontTheme: theme } = useStorefrontSettings();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);

  const value = {
    theme,
    isDefault: theme === 'default',
    isGrocery: theme === 'grocery',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
