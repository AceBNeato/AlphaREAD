import { createHashRouter, Navigate, Outlet } from "react-router";
import Activation from "./pages/Activation";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import Lesson from "./pages/Lesson";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import { BackButtonHandler } from "./components/BackButtonHandler";

function RootLayout() {
  return (
    <>
      <BackButtonHandler />
      <Outlet />
    </>
  );
}

export const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        Component: Activation,
      },
      {
        path: "/profile-setup",
        Component: ProfileSetup,
      },
      {
        path: "/dashboard",
        Component: Dashboard,
      },
      {
        path: "/levels",
        Component: Levels,
      },
      {
        path: "/lesson/:levelId",
        Component: Lesson,
      },
      {
        path: "/settings",
        Component: Settings,
      },
      {
        path: "/admin-login",
        Component: AdminLogin,
      },
      {
        path: "/admin",
        Component: AdminDashboard,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ]
  }
]);