import { createBrowserRouter, Navigate } from "react-router";
import Home from "./pages/Home";
import Lesson from "./pages/Lesson";

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
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);