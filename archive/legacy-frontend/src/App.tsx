import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { SimulationPage } from './pages/SimulationPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/engine" element={<SimulationPage />} />
        <Route path="/simulation" element={<Navigate to="/engine" replace />} />
        <Route path="/demo" element={<InvestigationProvider><DemoShell /></InvestigationProvider>}>
          <Route index element={<DemoPage />} />
          <Route path="merchant" element={<MerchantPage />} />
          <Route path="investigations" element={<InvestigationPage />} />
          <Route path="graph" element={<EvidenceGraphPage />} />
          <Route path="detection" element={<DetectionPage />} />
          <Route path="analyst" element={<AnalystPage />} />
          <Route path="response" element={<ResponsePage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
