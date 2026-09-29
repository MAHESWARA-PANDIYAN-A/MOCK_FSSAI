import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, ApiResponse } from '../types';
import apiClient from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (name: string, email: string, mobile: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fssai_token'));
  const [role, setRole] = useState<UserRole | null>(
    (localStorage.getItem('fssai_role') as UserRole) || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const activeToken = localStorage.getItem('fssai_token');
      if (!activeToken) {
        setUser(null);
        setRole(null);
        setIsLoading(false);
        return;
      }
      const res = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
        setRole(res.data.data.role);
        localStorage.setItem('fssai_role', res.data.data.role);
      }
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, selectedRole?: UserRole) => {
    const res = await apiClient.post<ApiResponse<{ access_token: string; user: User }>>('/auth/login', {
      email,
      password,
      role: selectedRole,
    });
    if (res.data.success) {
      const { access_token, user: loggedUser } = res.data.data;
      localStorage.setItem('fssai_token', access_token);
      localStorage.setItem('fssai_role', loggedUser.role);
      setToken(access_token);
      setUser(loggedUser);
      setRole(loggedUser.role);
    }
  };

  const register = async (
    name: string,
    email: string,
    mobile: string,
    password: string,
    confirm_password: string
  ) => {
    const res = await apiClient.post<ApiResponse<{ access_token: string; user: User }>>('/auth/register', {
      name,
      email,
      mobile,
      password,
      confirm_password,
    });
    if (res.data.success) {
      const { access_token, user: newUser } = res.data.data;
      localStorage.setItem('fssai_token', access_token);
      localStorage.setItem('fssai_role', newUser.role);
      setToken(access_token);
      setUser(newUser);
      setRole(newUser.role);
    }
  };

  const logout = () => {
    localStorage.removeItem('fssai_token');
    localStorage.removeItem('fssai_role');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
