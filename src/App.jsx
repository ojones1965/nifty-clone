import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import ItemEditor from './pages/ItemEditor';
import Analytics from './pages/Analytics';
import Automation from './pages/Automation';
import Settings from './pages/Settings';
import Marketplaces from './pages/Marketplaces';

function Shell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/item/new" element={<ItemEditor />} />
        <Route path="/item/:id" element={<ItemEditor />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/:tab" element={<Analytics />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/marketplaces" element={<Marketplaces />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
