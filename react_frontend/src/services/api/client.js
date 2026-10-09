// WHY: Centralizing fetch logic here ensures every request across the app 
// automatically includes the auth token and handles errors (like 401 Unauthorized) 
// the exact same way, preventing duplicate code in every API call.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // BUG FIX: If we get a 401 (Unauthorized), we clear the token.
    // BUT we should only force a page reload to /login if they aren't already trying to log in!
    // Otherwise, typing a wrong password causes the screen to flash and reload.
    if (response.status === 401) {
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('isPlatform');
      
      const isTryingToLogin = endpoint.includes('/auth/login');
      if (!isTryingToLogin) {
        window.location.href = '/login'; 
      }
    }
    // Throw a readable error message from the backend so the component can display it
    throw new Error(data?.message || `Error ${response.status}: Request failed`);
  }

  // Unwrap { success, data }
  return data?.data || data; 
};
