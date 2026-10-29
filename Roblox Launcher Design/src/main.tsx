import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

console.log("=== REACT APP STARTED ===");
try {
  createRoot(document.getElementById("root")!).render(<App />);
  console.log("=== RENDER CALLED ===");
} catch (e) {
  console.error("=== RENDER ERROR ===", e);
}
