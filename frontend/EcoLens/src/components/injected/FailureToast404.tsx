import React from "react";

export default function FailureToast404() {
    const ref = React.useRef<HTMLDivElement>(null as any);
    React.useEffect(() => {
        const el = ref.current as HTMLDivElement | null;
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
        const t = setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }, 30);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            ref={ref as any}
            style={{
                position: "fixed",
                top: 20,
                right: 20,
                background: "#dc2626",
                color: "white",
                padding: "16px 20px",
                borderRadius: 8,
                fontSize: 14,
                zIndex: 2147483647,
                fontFamily: "system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                maxWidth: 320,
                lineHeight: 1.4,
                transition: "all 250ms ease",
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 16 }}>❌</span>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Unable to find product data
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                        Try manually searching with broader terms
                    </div>
                </div>
            </div>
        </div>
    );
}
