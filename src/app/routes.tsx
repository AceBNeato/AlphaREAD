import { createHashRouter, createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router";
import { Capacitor } from "@capacitor/core";
import Activation from "./pages/Activation";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import Levels from "./pages/Levels";
import Lesson from "./pages/Lesson";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import { BackButtonHandler } from "./components/BackButtonHandler";
import { ProtectedRoute } from "./components/ProtectedRoute";

function GlobalErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Oops! Something went wrong</h1>
        <p className="text-gray-500 dark:text-gray-400">
          We encountered an unexpected error. Please try refreshing the page or navigating back home.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}

function RootLayout() {
  return (
    <>
      <BackButtonHandler />
      <Outlet />
    </>
  );
}

const routes = [
  {
    element: <RootLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      {
        path: "/",
        Component: Activation,
      },
      {
        path: "/admin-login",
        Component: AdminLogin,
      },
      // Authenticated Student Routes
      {
        element: <ProtectedRoute allowedRoles={["student", "teacher-preview"]} redirectPath="/" />,
        children: [
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
        ]
      },
      // Authenticated Admin Routes
      {
        element: <ProtectedRoute allowedRoles={["admin"]} redirectPath="/admin-login" />,
        children: [
          {
            path: "/admin",
            Component: AdminDashboard,
          },
        ]
      },
      // Authenticated Teacher Routes
      {
        element: <ProtectedRoute allowedRoles={["teacher", "admin"]} redirectPath="/" />,
        children: [
          {
            path: "/teacher-dashboard",
            Component: TeacherDashboard,
          },
        ]
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ]
  }
];

export const router = Capacitor.isNativePlatform()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);