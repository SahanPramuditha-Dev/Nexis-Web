import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NexisShell } from '@/design/components/NexisShell'
import { HomePage } from '@/pages/home/HomePage'
import { HistoryPage } from '@/pages/history/HistoryPage'
import { MeasurementDetailPage } from '@/pages/history/MeasurementDetailPage'
import { MapPage } from '@/pages/map/MapPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { ToolsPage } from '@/pages/tools/ToolsPage'
import { TopologyPage } from '@/pages/topology/TopologyPage'
import { AlertsPage } from '@/pages/alerts/AlertsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { DocsPage } from '@/pages/docs/DocsPage'
import { LegalPage } from '@/pages/legal/LegalPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NexisShell />}>
          <Route index element={<HomePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<MeasurementDetailPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="topology" element={<TopologyPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="privacy" element={<LegalPage initialTab="privacy" />} />
          <Route path="terms" element={<LegalPage initialTab="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
export default App
