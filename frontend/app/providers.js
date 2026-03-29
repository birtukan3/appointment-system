"use client";

import { createContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "./lib/api";
import toast from "react-hot-toast";

export const AppContext = createContext();

export default function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        api.setToken(token);
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Login failed");
      }
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      api.setToken(token);
      setUser(userData);
      
      return userData;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    api.setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/");
  };

  const updateUser = (nextUser) => {
    setUser((currentUser) => {
      const updatedUser = { ...(currentUser || {}), ...(nextUser || {}) };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        hasRole,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}