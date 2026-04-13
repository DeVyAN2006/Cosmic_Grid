import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar }   from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { useSolarData } from './hooks/useSolarData';

// Wrapper to share forecast data between Sidebar and Dashboard
function AppShell() {
  const { forecast } = useSolarData();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar forecast={forecast} />
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/globe"   element={<Dashboard />} />
        <Route path="/regions" element={<Dashboard />} />
        <Route path="/planner" element={<Dashboard />} />
        <Route path="/archive" element={<Dashboard />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
