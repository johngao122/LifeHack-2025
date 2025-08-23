import React from "react";

interface AnalyzingToastProps {
    text: string;
}

export function AnalyzingToast({ text }: AnalyzingToastProps) {
    React.useEffect(() => {
        const styleId = "ecolens-react-keyframes";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `@keyframes ecolens-spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <div
            style={{
                background: "#059669",
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                fontSize: 14,
                zIndex: 2147483647,
                fontFamily: "system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 8,
            }}
        >
            <span
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    display: "inline-block",
                    animation: "ecolens-spin 1s linear infinite",
                }}
            />
            <span>🌱 Analyzing "{text}" Green Score...</span>
        </div>
    );
}

export default AnalyzingToast;
