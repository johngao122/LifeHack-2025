import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ProductSustainabilityReport from "./components/ProductSustainabilityReport.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ProductSustainabilityReport />
    </StrictMode>
);
