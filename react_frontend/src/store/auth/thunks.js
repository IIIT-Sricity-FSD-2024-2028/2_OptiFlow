import { createApiThunk } from "../core/createApiThunk";
import { resetStore } from "../core/resetStore";
import * as authApi from "../../services/api/auth";

import {
    getToken,
    clearSession,
    setSession,
    isPlatformSession
} from "../../services/auth/session";

//same shapes as the old AuthContext.js
export const tenantUser = (response) => {
    const u = response.user || {};
    return {...u,role:response.role||u.role,isPlatform:false};

}

export const platformUser = (response) => {
  const u = response.adminUser || response.user || {};
  return { ...u, role: "platform_admin", isPlatform: true };
};

export const restoredUser = (data, isPlatform) => {
  const u = data.user || data; // the backend wraps it in `.user` or returns it directly
  const role = isPlatform ? "platform_admin" : u.role || u.roleSlug;
  return { ...u, role, isPlatform };
};

export const login = createApiThunk("auth/login",async(credentials,options)=>{
    const response = await authApi.login(credentials,options);
    setSession(response.token,false);
    return { user: tenantUser(response)};
});

export const platformLogin = createApiThunk("auth/platformLogin",async(credentials,options)=>{
    const response = await authApi.platformLogin(credentials,options);
    setSession(response.token,true);
    return { user: platformUser(response)};
});
export const registerCompany = createApiThunk("auth/registerCompany", async (payload, options) => {
  const response = await authApi.registerCompany(payload, options);
  //keep the token, but do not sign the user in (they see a success screen).
  if (response?.token) setSession(response.token, false);
  return null;
});

export const restoreSession = createApiThunk(
  "auth/restoreSession",
  async (_arg, options) => {
    const token = getToken();
    if (!token) return { user: null };
    const isPlatform = isPlatformSession();
    try {
      const data = await (isPlatform ? authApi.getPlatformMe(options) : authApi.getMe(options));
      return { user: restoredUser(data, isPlatform) };
    } catch (err) {
      clearSession(); // a dead session is dropped, then the error reaches the reducer
      throw err;
    }
  },
  {
    // Run once. React StrictMode runs effects twice in dev, and this skips the second call.
    condition: (_arg, { getState }) => {
      const { initialized, status } = getState().auth;
      return !initialized && status !== "loading";
    },
  },
);

export const logout = createApiThunk("auth/logout", async (_arg, options, { dispatch, getState }) => {
  // Decide from the session itself, never from the URL or role names (SEC-M2-20).
  const isPlatform = Boolean(getState().auth.user?.isPlatform) || isPlatformSession();
  if (isPlatform) {
    try {
      await authApi.platformLogout(options); // needs the token, so it runs before clearSession
    } catch (err) {
      console.error("Failed to logout from platform:", err);
    }
  }
  clearSession();
  dispatch(resetStore()); // wipes every slice, tenant or platform
  return null;
});