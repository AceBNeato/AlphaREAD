import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { App as CapacitorApp } from "@capacitor/app";

export function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const listener = CapacitorApp.addListener("backButton", () => {
      const path = location.pathname;
      
      // Top level pages should exit the app when back is pressed
      if (path === "/" || path === "/dashboard" || path === "/admin-login") {
        CapacitorApp.exitApp();
        return;
      }
      
      // Admin dashboard goes back to activation
      if (path === "/admin") {
        navigate("/", { replace: true });
        return;
      }
      
      // Levels page goes back to dashboard
      if (path === "/levels") {
        navigate("/dashboard", { replace: true });
        return;
      }

      // Inside a lesson goes back to levels list
      if (path.startsWith("/lesson/")) {
        const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
        if (confirmExit) {
          navigate("/levels", { replace: true });
        }
        return;
      }

      // Profile setup goes back to admin dashboard
      if (path === "/profile-setup") {
        navigate("/admin", { replace: true });
        return;
      }

      // Default fallback
      navigate(-1);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [location.pathname, navigate]);

  return null;
}
