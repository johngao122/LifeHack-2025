import React from "react";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

interface DetectedPopupProps {
    products: ProductInfo[];
    onClose: () => void;
    onOpenValidation: () => void;
}

export function DetectedPopup({
    products,
    onClose,
    onOpenValidation,
}: DetectedPopupProps) {
    const ref = React.useRef<HTMLDivElement>(null as any);
    React.useEffect(() => {
        const styleId = "ecolens-react-keyframes";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `@keyframes ecolens-wiggle { 0%,100% { transform: rotate(0deg);} 25% { transform: rotate(10deg);} 75% { transform: rotate(-10deg);} }`;
            document.head.appendChild(style);
        }
        const el = ref.current as HTMLDivElement | null;
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateX(-50%) scale(0.88)";
        const t = setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateX(-50%) scale(1)";
        }, 50);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            ref={ref as any}
            style={{
                position: "fixed",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2147483650,
                background: "white",
                borderRadius: 12,
                padding: 16,
                minWidth: 320,
                maxWidth: 448,
                border: "1px solid #e5e7eb",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transition: "all 300ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={() => {
                const el = ref.current as any;
                if (!el) return;
                el.style.transform = "translateX(-50%) scale(1.05)";
            }}
            onMouseLeave={() => {
                const el = ref.current as any;
                if (!el) return;
                el.style.transform = "translateX(-50%) scale(1)";
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                    style={{
                        fontSize: 24,
                        animation: "ecolens-wiggle 1.5s infinite",
                        animationDelay: "2s" as any,
                    }}
                >
                    👁️
                </div>
                <div
                    style={{ fontWeight: 600, color: "#047857", fontSize: 14 }}
                >
                    {products.length > 1
                        ? "Valid products detected"
                        : "Product detected"}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        marginLeft: "auto",
                        color: "#9ca3af",
                        fontSize: 20,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    ×
                </button>
            </div>
            <div
                style={{
                    marginTop: 12,
                    borderTop: "1px solid #f3f4f6",
                    paddingTop: 12,
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 12,
                }}
            >
                Click to find out more
            </div>
            <div style={{ marginTop: 12, textAlign: "center" }}>
                <button
                    onClick={onOpenValidation}
                    style={{
                        background: "#059669",
                        color: "white",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                    }}
                >
                    Open
                </button>
            </div>
        </div>
    );
}

export default DetectedPopup;
