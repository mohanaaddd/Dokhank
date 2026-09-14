import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { Screen, TabName } from '../types';
import { canNavigate, tabForScreen } from '../utils/navigationMachine';

interface NavState {
  stack: Screen[];
  direction: 1 | -1;
}

type NavAction =
{type: 'push';screen: Screen;} |
{type: 'replace';screen: Screen;} |
{type: 'reset';screen: Screen;} |
{type: 'back';};

function reducer(state: NavState, action: NavAction): NavState {
  const current = state.stack[state.stack.length - 1];

  switch (action.type) {
    case 'push':{
        if (!canNavigate(current.name, action.screen.name)) return state;
        return { stack: [...state.stack, action.screen], direction: 1 };
      }
    case 'replace':{
        if (!canNavigate(current.name, action.screen.name)) return state;
        return { stack: [...state.stack.slice(0, -1), action.screen], direction: 1 };
      }
    case 'reset':
      return { stack: [action.screen], direction: -1 };
    case 'back':{
        if (state.stack.length < 2) return state;
        return { stack: state.stack.slice(0, -1), direction: -1 };
      }
    default:
      return state;
  }
}

interface NavigationContextValue {
  screen: Screen;
  direction: 1 | -1;
  canGoBack: boolean;
  activeTab: TabName | null;
  navigate: (screen: Screen) => void;
  replace: (screen: Screen) => void;
  reset: (screen: Screen) => void;
  back: () => void;
  goToTab: (tab: TabName) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  initialScreen,
  children



}: {initialScreen: Screen;children: React.ReactNode;}) {
  const [state, dispatch] = useReducer(reducer, { stack: [initialScreen], direction: 1 });
  const screen = state.stack[state.stack.length - 1];

  const navigate = useCallback((next: Screen) => dispatch({ type: 'push', screen: next }), []);
  const replace = useCallback((next: Screen) => dispatch({ type: 'replace', screen: next }), []);
  const reset = useCallback((next: Screen) => dispatch({ type: 'reset', screen: next }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);

  const goToTab = useCallback(
    (tab: TabName) => dispatch({ type: 'reset', screen: { name: tab } as Screen }),
    []
  );

  const value = useMemo<NavigationContextValue>(
    () => ({
      screen,
      direction: state.direction,
      canGoBack: state.stack.length > 1,
      activeTab: tabForScreen(screen),
      navigate,
      replace,
      reset,
      back,
      goToTab
    }),
    [screen, state.direction, state.stack.length, navigate, replace, reset, back, goToTab]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}