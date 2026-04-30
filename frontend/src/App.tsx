import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import DataPage from './pages/DataPage';
import KanjiDetailPage from './pages/KanjiDetailPage';
import SearchPage from './pages/SearchPage';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/search/canvas" replace />} />
        <Route path="/search/:mode" element={<SearchPage />} />
        <Route path="/kanji/:literal" element={<KanjiDetailPage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/search/canvas" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
