import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { AppRole, Screen, TabName } from '../types';
import { canNavigate, graphFor, tabForScreen, type NavGraph } from '../utils/navigationMachine';

interface NavState {
  stack: Screen[];
  direction: 1 | -1;
}

type NavAction =
{type: 'push';screen: Screen;graph: NavGraph;} |
{type: 'replace';screen: Screen;graph: NavGraph;} |
{type: 'reset';screen: Screen;} |
{type: 'back';};

function reducer(state: NavState, action: NavAction): NavState {
  const current = state.stack[state.stack.length - 1];

  switch (action.type) {
    case 'push':{
        if (!canNavigate(action.graph, current.name, action.screen.name)) return state;
        return { stack: [...state.stack, action.screen], direction: 1 };
      }
    case 'replace':{
        if (!canNavigate(action.graph, current.name, action.screen.name)) return state;
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
  tabs: TabName[];
  /** False on full-bleed screens — the shell hides the tab bar. */
  showNav: boolean;
  navigate: (screen: Screen) => void;
  replace: (screen: Screen) => void;
  reset: (screen: Screen) => void;
  back: () => void;
  goToTab: (tab: TabName) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  role,
  initialScreen,
  children




}: {role: AppRole;initialScreen?: Screen;children: React.ReactNode;}) {
  const graph = useMemo(() => graphFor(role), [role]);
  const [state, dispatch] = useReducer(reducer, {
    stack: [initialScreen ?? graph.initial],
    direction: 1
  });
  const screen = state.stack[state.stack.length - 1];

  const navigate = useCallback(
    (next: Screen) => dispatch({ type: 'push', screen: next, graph }),
    [graph]
  );
  const replace = useCallback(
    (next: Screen) => dispatch({ type: 'replace', screen: next, graph }),
    [graph]
  );
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
      activeTab: tabForScreen(graph, screen),
      tabs: graph.tabs,
      showNav: !graph.fullscreen.includes(screen.name),
      navigate,
      replace,
      reset,
      back,
      goToTab
    }),
    [screen, state.direction, state.stack.length, graph, navigate, replace, reset, back, goToTab]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}