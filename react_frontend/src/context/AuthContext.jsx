import { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  login as loginThunk,
  changePassword as changePasswordThunk,
  platformLogin as platformLoginThunk,
  logout as logoutThunk,
  restoreSession,
  selectAuthUser,
  selectAuthLoading,
  selectSessionNotice,
} from '../store/auth';
// 1. Create the Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) =>{
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const loading = useSelector(selectAuthLoading);
  const sessionNotice = useSelector(selectSessionNotice);

  useEffect(()=>
  {
    dispatch(restoreSession());
  },[dispatch])

  const login = useCallback((credentials)=>dispatch(loginThunk(credentials)).unwrap(),[dispatch]);

  const platformLogin = useCallback(
    (credentials)=>dispatch(platformLoginThunk(credentials)).unwrap(),
    [dispatch]
  );

  const changePassword = useCallback(
    (body)=>dispatch(changePasswordThunk(body)).unwrap(),
    [dispatch]
  );

  const logout = useCallback(async ()=>{
    await dispatch(logoutThunk()).unwrap();
    window.location.href = '/login';
  },[dispatch]);

  const value = useMemo(()=>({
    user,
    login,
    platformLogin,
    logout,
    platformLogout:logout,
    changePassword,
    loading,
    sessionNotice,
  }),[user,login,platformLogin,logout,changePassword,loading,sessionNotice]);

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
};

// Custom hook to use Auth Context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
