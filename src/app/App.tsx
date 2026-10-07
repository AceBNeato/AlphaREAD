import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { useEffect } from "react";
export default function App() {
  useEffect(() => {
    // Capgo Auto-updater removed to prevent OTA crash loop
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </LanguageProvider>
  );
}