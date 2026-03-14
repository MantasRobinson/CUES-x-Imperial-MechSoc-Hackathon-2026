import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user:    null,
  token:   localStorage.getItem('pb_token') || null,
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, loading: false };
    case 'LOADED':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Rehydrate from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('pb_token');
    if (!token) {
      dispatch({ type: 'LOADED' });
      return;
    }
    api.get('/auth/me')
      .then((res) => dispatch({ type: 'SET_USER', payload: res.data.user }))
      .catch(() => {
        localStorage.removeItem('pb_token');
        dispatch({ type: 'LOADED' });
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('pb_token', res.data.token);
    dispatch({ type: 'LOGIN', payload: res.data });
  };

  const register = async (email, password, displayName) => {
    const res = await api.post('/auth/register', { email, password, displayName });
    localStorage.setItem('pb_token', res.data.token);
    dispatch({ type: 'LOGIN', payload: res.data });
  };

  const logout = () => {
    localStorage.removeItem('pb_token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updatedUser) => {
    dispatch({ type: 'SET_USER', payload: updatedUser });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
