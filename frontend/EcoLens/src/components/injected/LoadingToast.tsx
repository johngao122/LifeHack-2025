import React from "react";

interface LoadingToastProps {
    text?: string;
    timeoutMs?: number;
}

export function LoadingToast({
    text = "Analyzing page...",
    timeoutMs = 15000,
}: LoadingToastProps) {
    React.useEffect(() => {
        const styleId = "ecolens-react-keyframes";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `@keyframes ecolens-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        if (!timeoutMs) return;
        const t = setTimeout(() => {
            // no-op; caller handles unmount
        }, timeoutMs);
        return () => clearTimeout(t);
    }, [timeoutMs]);

    return (
        <div
            style={{
                background: "#059669",
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <span
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTop: "2px solid white",
                    display: "inline-block",
                    animation: "ecolens-spin 1s linear infinite",
                }}
            />
            <span>{text}</span>
        </div>
    );
}

export default LoadingToast;
