import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { MCPAssistantPage } from './pages/MCPAssistantPage';
import { VillageFormPage } from './pages/VillageFormPage';

function AppContent() {
  const { activeTab } = useApp();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Top Persistent Navigation */}
      <Navbar />

      {/* Main Dynamic View Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'mcp' && <MCPAssistantPage />}
        {activeTab === 'village' && <VillageFormPage />}
      </main>

      {/* Bottom Global Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
