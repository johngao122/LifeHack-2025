import React from "react";
import { createRoot } from "react-dom/client";
import LoadingToast from "@/components/injected/LoadingToast";
import ResultToast from "@/components/injected/ResultToast";
import DetectedPopup from "@/components/injected/DetectedPopup";
import ValidationCard from "@/components/injected/ValidationCard";
import EditForm from "@/components/injected/EditForm";
import AnalyzingToast from "@/components/injected/AnalyzingToast";
import FailureToast404 from "@/components/injected/FailureToast404";

type ComponentRegistry = Record<string, React.ComponentType<any>>;

// Example minimal components. Extend/replace with your real ones as needed.
function ProductChip({ text }: { text: string }) {
    return (
        <span
            style={{
                background: "#059669",
                color: "white",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                marginLeft: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}
        >
            <span style={{ fontSize: 14 }}>🌱</span>
            {text}
        </span>
    );
}

const registry: ComponentRegistry = {
    ProductChip,
    LoadingToast,
    ResultToast,
    DetectedPopup,
    ValidationCard,
    EditForm,
    AnalyzingToast,
    FailureToast404,
};

function mount(target: Element, name: string, props: any) {
    const Cmp = registry[name];
    if (!Cmp) return;
    const root = createRoot(target);
    root.render(React.createElement(Cmp, props));
    (target as any).__ecolensUnmount = () => root.unmount();
}

function unmount(target: Element) {
    (target as any).__ecolensUnmount?.();
}

function mountAtPlaceholders() {
    const nodes = document.querySelectorAll<HTMLElement>(
        "[data-ecolens-component]"
    );
    nodes.forEach((node) => {
        if ((node as any).__ecolensMounted) return;
        const name = node.dataset.ecolensComponent!;
        const propsRaw = node.dataset.ecolensProps;
        let props: any = {};
        if (propsRaw) {
            try {
                props = JSON.parse(propsRaw);
            } catch {}
        }

        mount(node, name, props);
        (node as any).__ecolensMounted = true;
    });
}

// Auto-mount on load
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAtPlaceholders());
} else {
    mountAtPlaceholders();
}

// Observe DOM for newly added placeholders
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
            if (!(node instanceof Element)) continue;
            if (
                node.matches?.("[data-ecolens-component]") ||
                node.querySelector?.("[data-ecolens-component]")
            ) {
                mountAtPlaceholders();
                return;
            }
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// Expose simple API for the content script to call directly
(window as any).EcoLensUI = { mount, unmount, mountAtPlaceholders };

// Bridge for content-script isolated world via window.postMessage
type BridgeMessage =
    | {
          source: "ecolens";
          channel: "ui";
          action: "mount";
          mountId: string;
          component: string;
          props?: any;
      }
    | {
          source: "ecolens";
          channel: "ui";
          action: "unmount";
          mountId: string;
      }
    | {
          source: "ecolens";
          channel: "ui";
          action: "placeholders";
      }
    | {
          source: "ecolens";
          channel: "ui";
          action: "mountAnalyzing";
          mountId: string;
          props?: { text?: string };
      }
    | {
          source: "ecolens";
          channel: "ui";
          action: "mount404";
          mountId: string;
      };

function handleBridgeMessage(e: MessageEvent) {
    const data = e.data as BridgeMessage;
    if (!data || data.source !== "ecolens" || data.channel !== "ui") return;
    try {
        if (data.action === "mount") {
            const el = document.getElementById(data.mountId);
            if (!el) return;
            const props = { ...(data.props ?? {}) } as any;
            if (data.component === "DetectedPopup") {
                const products = Array.isArray(props.products)
                    ? props.products
                    : [];
                props.onClose = () => {
                    try {
                        unmount(el);
                    } catch {}
                    try {
                        el.remove();
                    } catch {}
                };
                props.onOpenValidation = () => {
                    try {
                        const product = products[0];
                        mount(el, "ValidationCard", {
                            product,
                            onYes: () => {
                                try {
                                    unmount(el);
                                } catch {}
                                window.postMessage(
                                    {
                                        source: "ecolens",
                                        channel: "ui",
                                        event: "validationYes",
                                        product,
                                    },
                                    "*"
                                );
                            },
                            onEdit: () => {
                                mount(el, "EditForm", {
                                    product,
                                    onSave: (newName: string) => {
                                        const updated = {
                                            ...product,
                                            cleanedName: newName,
                                        };
                                        try {
                                            unmount(el);
                                        } catch {}
                                        window.postMessage(
                                            {
                                                source: "ecolens",
                                                channel: "ui",
                                                event: "validationYes",
                                                product: updated,
                                            },
                                            "*"
                                        );
                                    },
                                    onCancel: () => {
                                        try {
                                            unmount(el);
                                        } catch {}
                                        mount(el, "ValidationCard", {
                                            product,
                                            onYes: () => {
                                                try {
                                                    unmount(el);
                                                } catch {}
                                                window.postMessage(
                                                    {
                                                        source: "ecolens",
                                                        channel: "ui",
                                                        event: "validationYes",
                                                        product,
                                                    },
                                                    "*"
                                                );
                                            },
                                            onEdit: () =>
                                                props.onOpenValidation?.(),
                                        });
                                    },
                                });
                            },
                        });
                    } catch {}
                };
                mount(el, data.component, props);
                return;
            }
            mount(el, data.component, props);
        } else if (data.action === "unmount") {
            const el = document.getElementById(data.mountId);
            if (!el) return;
            unmount(el);
        } else if (data.action === "placeholders") {
            mountAtPlaceholders();
        } else if (data.action === "mountAnalyzing") {
            const el = document.getElementById(data.mountId);
            if (!el) return;
            mount(el, "AnalyzingToast", { text: data.props?.text || "" });
        } else if (data.action === "mount404") {
            const el = document.getElementById(data.mountId);
            if (!el) return;
            mount(el, "FailureToast404", {});
        }
    } catch (err) {
        // swallow
    }
}

window.addEventListener("message", handleBridgeMessage);

// Handshake: notify readiness
try {
    window.postMessage(
        { source: "ecolens", channel: "ui", event: "ready" },
        "*"
    );
} catch {}
