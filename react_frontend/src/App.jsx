import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './shared/components/Toast';
import { router } from './app/router';
import { ApiEventsBridge } from './app/ApiEventsBridge';

// WHY: Wrapping RouterProvider with ToastProvider allows any page or modal across
// all 9 actor roles to trigger toasts seamlessly via the useToast() hook.
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ApiEventsBridge />
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
