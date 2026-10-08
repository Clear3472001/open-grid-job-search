import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { hasAccess } from "@/lib/access";

export default function AccessGuard() {
  if (!hasAccess()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}