import { BrowserRouter, HashRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';

// Hash routing is used for static previews where the server cannot rewrite deep links.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;
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
import { AIEnginePage } from './pages/AIEnginePage';
import { PortfolioProvider } from './hooks/usePortfolio';
import { InvestigationProvider, useInvestigation } from './hooks/useInvestigation';
import { EngineShell } from './components/navigation/EngineShell';

function EngineProviders() {
  return <PortfolioProvider mode="user"><InvestigationProvider><Outlet /></InvestigationProvider></PortfolioProvider>;
}

function DemoProviders() {
  return <PortfolioProvider mode="demo"><InvestigationProvider><Outlet /></InvestigationProvider></PortfolioProvider>;
}

function RequireUserDataset() {
  const { custom, started, detailsOpen } = useInvestigation();
  return custom && started && detailsOpen ? <Outlet /> : <Navigate to="/ai-engine/analyze" replace />;
}

function RequireDemoRun() {
  const { started, detailsOpen } = useInvestigation();
  return started && detailsOpen ? <Outlet /> : <Navigate to="/demo" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route element={<EngineProviders />}>
          <Route path="/ai-engine" element={<EngineShell />}>
            <Route index element={<AIEnginePage />} />
            <Route path="analyze" element={<UploadPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route element={<RequireUserDataset />}>
              <Route path="portfolio/:key" element={<CasePage />} />
              <Route path="investigations" element={<InvestigationPage />} />
              <Route path="patterns" element={<PatternsPage />} />
              <Route path="merchant" element={<MerchantPage />} />
              <Route path="graph" element={<EvidenceGraphPage />} />
              <Route path="detection" element={<DetectionPage />} />
              <Route path="analyst" element={<AnalystPage />} />
              <Route path="response" element={<ResponsePage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/engine" element={<Navigate to="/ai-engine" replace />} />
        <Route path="/simulation" element={<Navigate to="/ai-engine" replace />} />
        <Route path="/demo/upload" element={<Navigate to="/ai-engine/analyze" replace />} />
        <Route element={<DemoProviders />}>
          <Route path="/demo" element={<DemoShell />}>
            <Route index element={<DemoPage />} />
            <Route element={<RequireDemoRun />}>
              <Route path="merchant" element={<MerchantPage />} />
              <Route path="investigations" element={<InvestigationPage />} />
              <Route path="graph" element={<EvidenceGraphPage />} />
              <Route path="detection" element={<DetectionPage />} />
              <Route path="analyst" element={<AnalystPage />} />
              <Route path="response" element={<ResponsePage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="portfolio/:key" element={<CasePage />} />
              <Route path="patterns" element={<PatternsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
