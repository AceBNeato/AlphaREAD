import { createBrowserRouter, Navigate } from "react-router";
import Home from "./pages/Home";
import Lesson from "./pages/Lesson";
import VoicePractice from "./pages/VoicePractice";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/lesson/:levelId",
    Component: Lesson,
  },
  {
    path: "/voice-practice",
    Component: VoicePractice,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);