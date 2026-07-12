import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { AppRole, validateStoredSession } from "../services/session";

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
  redirectPath?: string;
}

export function ProtectedRoute({ allowedRoles, redirectPath = "/" }: ProtectedRouteProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { valid } = await validateStoredSession(allowedRoles);
      
      if (isMounted) {
        setIsAuthorized(valid);
        setIsValidating(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
