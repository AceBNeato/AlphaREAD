import { createHashRouter, Navigate } from "react-router";
import MainMenu from "./pages/MainMenu";
import LevelsPage from "./pages/LevelsPage";
import Lesson from "./pages/Lesson";
import VoicePractice from "./pages/VoicePractice";
import ProfileSelector from "./pages/ProfileSelector";
import Settings from "./pages/Settings";

export const router = createHashRouter([
  {
    path: "/",
    Component: MainMenu,
  },
  {
    path: "/levels",
    Component: LevelsPage,
  },
  {
    path: "/level/lesson/:levelId",
    Component: Lesson,
  },
  {
    path: "/voice-practice",
    Component: VoicePractice,
  },
  {
    path: "/profiles",
    Component: ProfileSelector,
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