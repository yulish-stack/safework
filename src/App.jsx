import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import MapView from './components/MapView';
import LocationDetail from './pages/LocationDetail';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"             element={<MapView />} />
        <Route path="/location/:id" element={<LocationDetail />} />
        <Route path="/admin"        element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
