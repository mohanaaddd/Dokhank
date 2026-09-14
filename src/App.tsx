import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { AddressProvider } from './contexts/AddressContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { LocaleProvider, type AccentName } from './contexts/LocaleContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { OrderProvider } from './contexts/OrderContext';
import { Address } from './pages/Address';
import { Auth } from './pages/Auth';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Delivered } from './pages/Delivered';
import { Home } from './pages/Home';
import { Location } from './pages/Location';
import { Orders } from './pages/Orders';
import { ProductDetail } from './pages/ProductDetail';
import { Profile } from './pages/Profile';
import { Search } from './pages/Search';
import { Tracking } from './pages/Tracking';
import { Welcome } from './pages/Welcome';
import { screenKey } from './utils/navigationMachine';
import type { Locale } from './types';

function ScreenRouter() {
  const { screen, direction } = useNavigation();

  const render = () => {
    switch (screen.name) {
      case 'welcome':
        return <Welcome />;
      case 'auth':
        return <Auth />;
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'product':
        return <ProductDetail productId={screen.productId} />;
      case 'cart':
        return <Cart />;
      case 'location':
        return <Location />;
      case 'address':
        return <Address />;
      case 'checkout':
        return <Checkout />;
      case 'tracking':
        return <Tracking orderId={screen.orderId} />;
      case 'delivered':
        return <Delivered orderId={screen.orderId} />;
      case 'orders':
        return <Orders />;
      case 'profile':
        return <Profile />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screenKey(screen)}
        initial={{ opacity: 0, x: direction * 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -18 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-1 flex-col overflow-hidden">
        
        {render()}
      </motion.div>
    </AnimatePresence>);

}

interface AppProps {
  /** Interface language — Arabic also flips the whole layout to RTL. */
  language?: Locale;
  /** Neon accent that repaints every primary action across the app. */
  accent?: AccentName;
  /** Start on the welcome + sign-up flow, or drop straight into the shop. */
  startAtOnboarding?: boolean;
}

export function App({ language = 'en', accent = 'lime', startAtOnboarding = true }: AppProps) {
  return (
    <LocaleProvider initialLocale={language} initialAccent={accent}>
      <AuthProvider>
        <AddressProvider>
          <FavoritesProvider>
            <CartProvider>
              <OrderProvider>
                <NavigationProvider
                  key={startAtOnboarding ? 'welcome' : 'home'}
                  initialScreen={startAtOnboarding ? { name: 'welcome' } : { name: 'home' }}>
                  
                  <AppShell>
                    <ScreenRouter />
                  </AppShell>
                </NavigationProvider>
              </OrderProvider>
            </CartProvider>
          </FavoritesProvider>
        </AddressProvider>
      </AuthProvider>
    </LocaleProvider>);

}