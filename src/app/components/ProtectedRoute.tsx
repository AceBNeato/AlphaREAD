import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { AppRole, validateStoredSession } from "../services/session";

interface ProtectedRouteProps {
  allow: AppRole[];
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ allow, children, redirectTo = "/" }: ProtectedRouteProps) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let mounted = true;

    validateStoredSession(allow).then(({ valid }) => {
      if (!mounted) return;
      setState(valid ? "allowed" : "denied");
    });

    return () => {
      mounted = false;
    };
  }, [allow]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="w-12 h-12 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "denied") {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
