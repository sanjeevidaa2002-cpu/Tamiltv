'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface AdminUser {
  username: string;
  role: 'superadmin' | 'admin' | 'editor';
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCredentials: (currentPassword: string, newPassword?: string, newUsername?: string) => Promise<{ success: boolean; error?: string }>;
  checkSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') : null;
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
        headers['x-admin-token'] = storedToken;
      }

      const res = await fetch('/api/admin/auth', {
        method: 'GET',
        cache: 'no-store',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.admin) {
          setAdmin(data.admin);
          setIsAuthenticated(true);
          return true;
        }
      }
      setAdmin(null);
      setIsAuthenticated(false);
      return false;
    } catch {
      setAdmin(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Hard fallback timer: If auth takes longer than 2.5s, unlock UI
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 2500);

    const init = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') : null;
        const headers: Record<string, string> = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
          headers['x-admin-token'] = storedToken;
        }

        const res = await fetch('/api/admin/auth', {
          method: 'GET',
          cache: 'no-store',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (isMounted) {
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.admin) {
              setAdmin(data.admin);
              setIsAuthenticated(true);
              return;
            }
          }
          setAdmin(null);
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) {
          setAdmin(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.admin) {
        if (data.token && typeof window !== 'undefined') {
          localStorage.setItem('admin_session_token', data.token);
        }
        setAdmin(data.admin);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed. Invalid username or password.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network connection failed' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_session_token');
      }
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
    }
  };

  const updateCredentials = async (
    currentPassword: string,
    newPassword?: string,
    newUsername?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, newUsername }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.admin) {
          setAdmin(data.admin);
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network connection failed' };
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateCredentials,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
