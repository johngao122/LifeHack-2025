import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

document.addEventListener("DOMContentLoaded", () => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
