import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Logging global de errores no capturados (ayuda a localizar "r is not a function")
window.addEventListener("error", (event) => {
  // eslint-disable-next-line no-console
  console.error("[window.error]", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    errorName: event.error?.name,
    errorMessage: event.error?.message,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason: any = event.reason;
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", {
    message: reason?.message ?? String(reason),
    name: reason?.name,
    stack: reason?.stack,
    raw: reason,
  });
});

createRoot(document.getElementById("root")!).render(<App />);
