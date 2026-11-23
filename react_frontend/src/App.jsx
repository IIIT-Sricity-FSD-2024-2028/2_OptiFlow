import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './shared/components/Toast';
import { router } from './app/router';
import { ApiEventsBridge } from './app/ApiEventsBridge';
import { store } from './store';

// WHY: Wrapping RouterProvider with ToastProvider allows any page or modal across
// all 9 actor roles to trigger toasts seamlessly via the useToast() hook.
// The Redux Provider is outermost, so AuthProvider (and later the auth slice facade) can
// already read the store.
function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <ApiEventsBridge />
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
