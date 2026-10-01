import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { BranchProvider } from './context/BranchContext.jsx';
import ToastViewport from './shared_components/feedback/ToastProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider initialRole="SuperUser">
        <BranchProvider>
          <ToastProvider>
            <App />
            <ToastViewport />
          </ToastProvider>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
