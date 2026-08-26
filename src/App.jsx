import { useSyncExternalStore } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { getSession, subscribe } from './lib/store';
import AuthLayout from './components/AuthLayout';
import AppLayout from './components/AppLayout';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import ItemEditor from './pages/ItemEditor';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Settings from './pages/Settings';

// getSession() returns a cached snapshot (see authStore.js), so it is safe
// as a useSyncExternalStore getSnapshot.
function useSession() {
  return useSyncExternalStore(subscribe, getSession);
}

function PublicOnly() {
  const session = useSession();
  if (session) return <Navigate to="/" replace />;
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}

function RequireAuth() {
  const session = useSession();
  if (!session) return <Navigate to="/sign-in" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/item/new" element={<ItemEditor />} />
        <Route path="/item/:id" element={<ItemEditor />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/:tab" element={<Analytics />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
