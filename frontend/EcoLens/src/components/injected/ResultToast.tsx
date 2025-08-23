export type ResultToastType = "no-products" | "error";

interface ResultToastProps {
    type: ResultToastType;
}

export function ResultToast({ type }: ResultToastProps) {
    const color = type === "no-products" ? "#6b7280" : "#dc2626";
    const text =
        type === "no-products"
            ? "No products detected"
            : "Something went wrong, try again later";
    const icon = type === "no-products" ? "🤷" : "⚠️";

    return (
        <div
            style={{
                background: color,
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <span>{icon}</span>
            <span>{text}</span>
        </div>
    );
}

export default ResultToast;
