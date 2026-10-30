import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { purgeAllDemoAndMockData } from './services/store';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with automatic update checking
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Automatically update when new SW version is activated
  },
  onOfflineReady() {
    console.info('Vendy est prêt pour une utilisation hors-ligne.');
  },
});

// Purge any residual local mock/demo data from previous sessions
purgeAllDemoAndMockData();

createRoot(document.getElementById('root')!).render(<App />);
