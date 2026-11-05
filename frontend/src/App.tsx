import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';

// Hash routing is used for static previews where the server cannot rewrite deep links.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;
import { InvestigationProvider } from './hooks/useInvestigation';
import { DemoShell } from './components/navigation/DemoShell';
import { HomePage } from './pages/HomePage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { DemoPage } from './pages/DemoPage';
import { MerchantPage } from './pages/MerchantPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { EvidenceGraphPage } from './pages/EvidenceGraphPage';
import { DetectionPage } from './pages/DetectionPage';
import { AnalystPage } from './pages/AnalystPage';
import { ResponsePage } from './pages/ResponsePage';
import { AuditPage } from './pages/AuditPage';
import { UploadPage } from './pages/UploadPage';
import { PatternsPage } from './pages/PatternsPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { CasePage } from './pages/CasePage';
import { PortfolioProvider } from './hooks/usePortfolio';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/demo" element={<PortfolioProvider><InvestigationProvider><DemoShell /></InvestigationProvider></PortfolioProvider>}>
          <Route index element={<DemoPage />} />
          <Route path="merchant" element={<MerchantPage />} />
          <Route path="investigations" element={<InvestigationPage />} />
          <Route path="graph" element={<EvidenceGraphPage />} />
          <Route path="detection" element={<DetectionPage />} />
          <Route path="analyst" element={<AnalystPage />} />
          <Route path="response" element={<ResponsePage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="portfolio/:key" element={<CasePage />} />
          <Route path="patterns" element={<PatternsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
