import React from "react";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

interface EditFormProps {
    product: ProductInfo;
    onSave: (newName: string) => void;
    onCancel: () => void;
}

export function EditForm({ product, onSave, onCancel }: EditFormProps) {
    const [value, setValue] = React.useState<string>(product.cleanedName);
    const ref = React.useRef<HTMLDivElement>(null as any);
    const inputRef = React.useRef<HTMLInputElement>(null as any);

    React.useEffect(() => {
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

    React.useEffect(() => {
        const i = inputRef.current;
        if (i) {
            try {
                i.focus();
                i.select();
            } catch {}
        }
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
                Edit Product Name
            </h3>
            <input
                ref={inputRef as any}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#059669")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                style={{
                    width: "100%",
                    border: "2px solid #d1d5db",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 14,
                    margin: "12px 0",
                    fontFamily: "system-ui, sans-serif",
                    outline: "none",
                }}
            />
            <div
                style={{
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    borderRadius: 6,
                    padding: "8px 12px",
                    margin: "12px 0 16px 0",
                }}
            >
                <p
                    style={{
                        fontSize: 12,
                        color: "#92400e",
                        margin: 0,
                        fontWeight: 500,
                    }}
                >
                    💡 Remove quantities (2kg, 500ml), sizes (large, small), and
                    unnecessary brand details
                </p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                    onClick={() => onSave(value.trim() || product.cleanedName)}
                    style={{
                        background: "#059669",
                        color: "white",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                    }}
                >
                    💾 Save & Continue
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        background: "#6b7280",
                        color: "white",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                    }}
                >
                    ↩️ Cancel
                </button>
            </div>
        </div>
    );
}

export default EditForm;
