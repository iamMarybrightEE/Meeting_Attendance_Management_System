"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { USERS, CURRENT_USER, ACCOUNT_STATUS } from "../data/dummyData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);
  const [users, setUsers] = useState(USERS);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // true for demo

  const login = useCallback((email, password) => {
    const user = USERS.find((u) => u.email === email);
    if (user && user.status === ACCOUNT_STATUS.ACTIVE) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      return { success: true, user };
    }
    return { success: false, message: "Invalid credentials or account inactive." };
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const createUser = useCallback((userData) => {
    const newUser = {
      id: `usr-${Date.now()}`,
      employeeId: userData.employeeId || `URA-2026-${Date.now()}`,
      firstName: userData.firstName,
      middleName: userData.middleName || "",
      lastName: userData.lastName,
      username: userData.username,
      email: userData.email,
      contact: userData.contact,
      role: userData.role,
      roleId: userData.roleId,
      department: userData.department || "General",
      status: ACCOUNT_STATUS.ACTIVE,
      avatar: null,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginHistory: [],
      attendanceStats: { present: 0, excused: 0, missed: 0 },
    };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  }, []);

  const updateUser = useCallback((userId, updatedData) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updatedData } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...updatedData }));
    }
  }, [currentUser]);

  const deleteUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const changeUserStatus = useCallback((userId, newStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
  }, []);

  const changeUserRole = useCallback((userId, newRole, newRoleId) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, roleId: newRoleId } : u
      )
    );
  }, []);

  const resetPassword = useCallback((userId) => {
    // In real app this would trigger email. For demo, just return success
    return { success: true, message: "Password reset link sent successfully." };
  }, []);

  const value = {
    currentUser,
    users,
    isAuthenticated,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    changeUserStatus,
    changeUserRole,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
