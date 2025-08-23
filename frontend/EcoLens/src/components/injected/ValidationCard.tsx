import React from "react";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

interface ValidationCardProps {
    product: ProductInfo;
    onYes: () => void;
    onEdit: () => void;
}

export function ValidationCard({
    product,
    onYes,
    onEdit,
}: ValidationCardProps) {
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
        el.style.transform = "translateX(-50%) scale(0.94)";
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
        >
            <h3
                style={{
                    color: "#047857",
                    fontWeight: 600,
                    fontSize: 16,
                    margin: 0,
                }}
            >
                Product Detected
            </h3>
            <div
                style={{
                    background: "#f3f4f6",
                    borderRadius: 8,
                    padding: 12,
                    margin: "12px 0",
                    borderLeft: "4px solid #059669",
                }}
            >
                <p
                    style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1f2937",
                        margin: 0,
                    }}
                >
                    {product.cleanedName}
                </p>
            </div>
            <p
                style={{
                    color: "#374151",
                    fontSize: 14,
                    margin: "16px 0 8px 0",
                    fontWeight: 500,
                }}
            >
                Is this product correct?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                    onClick={onYes}
                    style={{
                        background: "#059669",
                        color: "white",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                        transition: "transform 150ms ease, filter 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                            "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                            "scale(1)";
                    }}
                >
                    ✓ Yes, continue
                </button>
                <button
                    onClick={onEdit}
                    style={{
                        background: "#6b7280",
                        color: "white",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                        transition: "transform 150ms ease, filter 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                            "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                            "scale(1)";
                    }}
                >
                    ✏️ Edit
                </button>
            </div>
        </div>
    );
}

export default ValidationCard;
