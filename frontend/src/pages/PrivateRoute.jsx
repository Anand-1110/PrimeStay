import React from "react";
import { Navigate } from "react-router-dom";

// Protects any route that requires a logged-in user
export function PrivateRoute({ children }) {
  const token = localStorage.getItem("jv_token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

// Protects routes that require admin role
export function AdminRoute({ children }) {
  const token = localStorage.getItem("jv_token");
  const role  = localStorage.getItem("jv_user_role");
  if (!token || role !== "admin") return <Navigate to="/" replace />;
  return children;
}
