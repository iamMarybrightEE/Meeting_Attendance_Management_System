"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi, usersApi, rolesApi, setSession, clearSession } from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser]         = useState(null);
  const [users, setUsers]                     = useState([]);
  const [roles, setRoles]                     = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  // USERS
  const fetchUsers = useCallback(async (params = {}) => {
    try {
      const { users: data } = await usersApi.list(params);
      setUsers(data || []);
      return data;
    } catch (err) {
      console.error("fetchUsers error:", err.message);
      return [];
    }
  }, []);

  // ROLES
  const fetchRoles = useCallback(async () => {
    try {
      const { roles: data } = await rolesApi.list();
      setRoles(data || []);
      return data;
    } catch (err) {
      console.error("fetchRoles error:", err.message);
      return [];
    }
  }, []);

  // Bootstrap session on mount
  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("mams_access_token");
    if (token) {
      authApi.me()
        .then(({ user }) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          // Load users and roles after auth
          fetchUsers();
          fetchRoles();
        })
        .catch(() => {
          clearSession();
          setIsAuthenticated(false);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUsers, fetchRoles]);

  // AUTH
  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      setSession(data.session);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      // Load users and roles after login
      fetchUsers();
      fetchRoles();
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchUsers, fetchRoles]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    clearSession();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUsers([]);
    setRoles([]);
  }, []);

  const createUser = useCallback(async (userData) => {
    const data = await usersApi.create(userData);
    setUsers((prev) => [data.user, ...prev]);
    return data.user;
  }, []);

  const updateUser = useCallback(async (userId, updatedData) => {
    const data = await usersApi.update(userId, updatedData);
    setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
    if (currentUser?.id === userId) setCurrentUser(data.user);
    return data.user;
  }, [currentUser]);

  const deleteUser = useCallback(async (userId) => {
    await usersApi.delete(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const changeUserStatus = useCallback(async (userId, newStatus) => {
    const data = await usersApi.changeStatus(userId, newStatus);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
    return data;
  }, []);

  const resetPassword = useCallback(async (userId, newPassword) => {
    return usersApi.changePassword(userId, { new_password: newPassword });
  }, []);

  const changePassword = useCallback(async (userId, currentPassword, newPassword) => {
    return usersApi.changePassword(userId, { current_password: currentPassword, new_password: newPassword });
  }, []);

  const updatePermissions = useCallback(async (userId, permissions) => {
    return usersApi.updatePermissions(userId, permissions);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        roles,
        isAuthenticated,
        isLoading,
        login,
        logout,
        fetchUsers,
        fetchRoles,
        createUser,
        updateUser,
        deleteUser,
        changeUserStatus,
        resetPassword,
        changePassword,
        updatePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
