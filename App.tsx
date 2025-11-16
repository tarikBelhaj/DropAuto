import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ProductCreator from './components/ProductCreator';
import { AppState } from './types';
import { LogoIcon } from './components/icons';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Dashboard);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCreateNewProduct = () => {
    setAppState(AppState.CreatingProduct);
  };

  const handleBackToDashboard = () => {
    setAppState(AppState.Dashboard);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={handleBackToDashboard} role="button" aria-label="Back to Dashboard">
              <LogoIcon className="h-8 w-8 text-primary-500" />
              <span className="font-bold text-xl text-white">Dropauto</span>
            </div>
            <div className="flex items-center">
                <button 
                  onClick={() => setIsSettingsOpen(true)} 
                  className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500" 
                  aria-label="Settings"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                    </svg>
                </button>
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {appState === AppState.Dashboard && <Dashboard onCreateNewProduct={handleCreateNewProduct} />}
        {appState === AppState.CreatingProduct && <ProductCreator onBackToDashboard={handleBackToDashboard} />}
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;