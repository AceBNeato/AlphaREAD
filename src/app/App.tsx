import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import { StudentProvider } from "./context/StudentContext";

export default function App() {
  return (
    <StudentProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </StudentProvider>
  );
}