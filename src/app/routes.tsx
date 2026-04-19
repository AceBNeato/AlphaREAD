import { createHashRouter, Navigate } from "react-router";
import WhoIsLearning from "./pages/WhoIsLearning";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import Lesson from "./pages/Lesson";
import Settings from "./pages/Settings";

export const router = createHashRouter([
  {
    path: "/",
    Component: WhoIsLearning,
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
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);