import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import { ApiKeyTest } from "./components/ApiKeyTest";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <ApiKeyTest />
    </ThemeProvider>
  );
}