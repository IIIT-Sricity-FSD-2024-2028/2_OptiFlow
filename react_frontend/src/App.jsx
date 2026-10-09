import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './shared/components/Toast';
import { router } from './app/router';

// WHY: Wrapping RouterProvider with ToastProvider allows any page or modal across
// all 9 actor roles to trigger toasts seamlessly via the useToast() hook.
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
