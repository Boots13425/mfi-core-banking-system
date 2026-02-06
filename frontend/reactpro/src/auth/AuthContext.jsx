import React, { createContext, useState, useCallback } from 'react';
import axiosInstance from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/auth/login/', {
        username,
        password,
      });

      const { access, refresh, user: userData } = response.data;

      setAccessToken(access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('accessToken', access);
      setUser(userData);

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessToken');
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await axiosInstance.post('/auth/refresh/', {
        refresh: refreshToken,
      });
      const newAccessToken = response.data.access;
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    } catch (err) {
      logout();
      return null;
    }
  }, [logout]);

  const fetchUserProfile = useCallback(async (token) => {
    try {
      const response = await axiosInstance.get('/auth/me/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch user profile');
      return null;
    }
  }, []);

  const value = {
    user,
    setUser,
    accessToken,
    setAccessToken,
    login,
    logout,
    refreshAccessToken,
    fetchUserProfile,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};