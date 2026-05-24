import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type HeaderMenuContextValue = {
  visible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const HeaderMenuContext = createContext<HeaderMenuContextValue | null>(null);

export function HeaderMenuProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const openMenu = useCallback(() => setVisible(true), []);
  const closeMenu = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ visible, openMenu, closeMenu }), [visible, openMenu, closeMenu]);
  return <HeaderMenuContext.Provider value={value}>{children}</HeaderMenuContext.Provider>;
}

export function useHeaderMenu(): HeaderMenuContextValue {
  const ctx = useContext(HeaderMenuContext);
  if (!ctx) {
    throw new Error('useHeaderMenu must be used within HeaderMenuProvider');
  }
  return ctx;
}

/** AppHeader dışında provider yoksa menü sessizce atlanır. */
export function useHeaderMenuOptional(): HeaderMenuContextValue | null {
  return useContext(HeaderMenuContext);
}
