import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { AddressProvider } from './contexts/AddressContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CourierProvider } from './contexts/CourierContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { LocaleProvider, type AccentName } from './contexts/LocaleContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { OpsProvider } from './contexts/OpsContext';
import { OrderProvider } from './contexts/OrderContext';
import { PaymentProvider } from './contexts/PaymentContext';
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
import { ActiveDelivery } from './pages/courier/ActiveDelivery';
import { CourierProfile } from './pages/courier/CourierProfile';
import { Queue } from './pages/courier/Queue';
import { Catalog } from './pages/owner/Catalog';
import { Couriers } from './pages/owner/Couriers';
import { Insights } from './pages/owner/Insights';
import { OrderBoard } from './pages/owner/OrderBoard';
import { OrderDetail } from './pages/owner/OrderDetail';
import { OwnerProfile } from './pages/owner/OwnerProfile';
import { ProductEditor } from './pages/owner/ProductEditor';
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
      case 'courier_queue':
        return <Queue />;
      case 'courier_active':
        return <ActiveDelivery />;
      case 'courier_profile':
        return <CourierProfile />;
      case 'owner_orders':
        return <OrderBoard />;
      case 'owner_order':
        return <OrderDetail orderId={screen.orderId} />;
      case 'owner_catalog':
        return <Catalog />;
      case 'owner_product':
        return <ProductEditor productId={screen.productId} />;
      case 'owner_insights':
        return <Insights />;
      case 'owner_profile':
        return <OwnerProfile />;
      case 'owner_couriers':
        return <Couriers />;
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

/**
 * Cart, addresses, payment methods and favourites are customer concepts. An
 * owner or courier session never mounts them, so they never fire a query.
 */
function CustomerStack({ children }: {children: React.ReactNode;}) {
  return (
    <AddressProvider>
      <PaymentProvider>
        <FavoritesProvider>
          <CartProvider>
            <OrderProvider>{children}</OrderProvider>
          </CartProvider>
        </FavoritesProvider>
      </PaymentProvider>
    </AddressProvider>);

}

function RoleRouter({ startAtOnboarding }: {startAtOnboarding: boolean;}) {
  const { user, initialized } = useAuth();
  if (!initialized) return null;
  const role = user?.role ?? 'customer';
  const needsOnboarding = Boolean(user && (user.name === 'Dokhan' || !user.ageVerified));

  const navigation =
  <NavigationProvider
    key={user ? `${role}:${user.id}` : `anon:${startAtOnboarding}`}
    role={role}
    initialScreen={user ? needsOnboarding ? { name: 'auth' } : undefined : startAtOnboarding ? { name: 'welcome' } : { name: 'home' }}>
    
      <AppShell>
        <ScreenRouter />
      </AppShell>
    </NavigationProvider>;


  if (role === 'owner') return <OpsProvider>{navigation}</OpsProvider>;
  if (role === 'courier') return <CourierProvider>{navigation}</CourierProvider>;
  return <CustomerStack>{navigation}</CustomerStack>;
}

interface AppProps {
  /** Interface language — Egyptian Arabic is the default and flips the layout to RTL. */
  language?: Locale;
  /** Neon accent that repaints every primary action across the app. Green ships unlocked. */
  accent?: AccentName;
  /** Start on the welcome + sign-up flow, or drop straight into the shop. */
  startAtOnboarding?: boolean;
}

export function App({ language = 'ar', accent = 'lime', startAtOnboarding = true }: AppProps) {
  return (
    <LocaleProvider initialLocale={language} initialAccent={accent}>
      <AuthProvider>
        <RoleRouter startAtOnboarding={startAtOnboarding} />
      </AuthProvider>
    </LocaleProvider>);

}