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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAtPlaceholders());
} else {
    mountAtPlaceholders();
}

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

/**
 * Mounts a component at the target element
 * @param target - The target element
 * @param name - The name of the component
 * @param props - The properties of the component
 */
function mount(target: Element, name: string, props: any) {
    const Cmp = registry[name];
    if (!Cmp) return;
    const root = createRoot(target);
    root.render(React.createElement(Cmp, props));
    (target as any).__ecolensUnmount = () => root.unmount();
}

/**
 * Unmounts a component at the target element
 * @param target - The target element
 */
function unmount(target: Element) {
    (target as any).__ecolensUnmount?.();
}

/**
 * Mounts components at placeholder containers
 * @returns void
 */
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

(window as any).EcoLensUI = { mount, unmount, mountAtPlaceholders };

/**
 * Bridge message types
 */
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

/**
 * Handles bridge messages from the content script
 * @param e - The message event
 * @returns void
 */
function handleBridgeMessage(e: MessageEvent) {
    const data = e.data as BridgeMessage;
    if (!data || data.source !== "ecolens" || data.channel !== "ui") return;

    try {
        switch (data.action) {
            case "mount":
                handleMount(data);
                break;
            case "unmount":
                handleUnmount(data);
                break;
            case "placeholders":
                mountAtPlaceholders();
                break;
            case "mountAnalyzing":
                handleMountAnalyzing(data);
                break;
            case "mount404":
                handleMount404(data);
                break;
        }
    } catch (err) {
        console.error("Bridge message handling error:", err);
    }
}

/**
 * Handles the mount action
 * @param data - The bridge message data
 * @returns void
 */
function handleMount(data: Extract<BridgeMessage, { action: "mount" }>) {
    const el = document.getElementById(data.mountId);
    if (!el) return;

    const props = { ...(data.props ?? {}) } as any;

    if (data.component === "DetectedPopup") {
        handleDetectedPopupMount(el, props);
    } else {
        mount(el, data.component, props);
    }
}

/**
 * Handles the detected popup mount action
 * @param el - The element to mount the popup to
 * @param props - The properties of the popup
 * @returns void
 */
function handleDetectedPopupMount(el: HTMLElement, props: any) {
    const products = Array.isArray(props.products) ? props.products : [];

    props.onClose = () => safeUnmountAndRemove(el);
    props.onOpenValidation = () => handleOpenValidation(el, products);

    mount(el, "DetectedPopup", props);
}

/**
 * Handles the open validation action
 * @param el - The element to mount the validation card to
 * @param products - The products to validate
 * @returns void
 */
function handleOpenValidation(el: HTMLElement, products: any[]) {
    try {
        const product = products[0];
        mount(el, "ValidationCard", {
            product,
            onYes: () => handleValidationYes(el, product),
            onEdit: () => handleEditProduct(el, product),
        });
    } catch (err) {
        console.error("Error opening validation:", err);
    }
}

/**
 * Handles the validation yes action
 * @param el - The element to unmount the validation card from
 * @param product - The product to validate
 * @returns void
 */
function handleValidationYes(el: HTMLElement, product: any) {
    safeUnmount(el);
    postValidationMessage("validationYes", product);
}

/**
 * Handles the edit product action
 * @param el - The element to mount the edit form to
 * @param product - The product to edit
 * @returns void
 */
function handleEditProduct(el: HTMLElement, product: any) {
    mount(el, "EditForm", {
        product,
        onSave: (newName: string) => {
            const updated = { ...product, cleanedName: newName };
            safeUnmount(el);
            postValidationMessage("validationYes", updated);
        },
        onCancel: () => {
            safeUnmount(el);
            mount(el, "ValidationCard", {
                product,
                onYes: () => handleValidationYes(el, product),
                onEdit: () => handleEditProduct(el, product),
            });
        },
    });
}

/**
 * Handles the unmount action
 * @param data - The bridge message data
 * @returns void
 */
function handleUnmount(data: Extract<BridgeMessage, { action: "unmount" }>) {
    const el = document.getElementById(data.mountId);
    if (el) safeUnmount(el);
}

/**
 * Handles the mount analyzing action
 * @param data - The bridge message data
 * @returns void
 */
function handleMountAnalyzing(
    data: Extract<BridgeMessage, { action: "mountAnalyzing" }>
) {
    const el = document.getElementById(data.mountId);
    if (el) {
        mount(el, "AnalyzingToast", { text: data.props?.text || "" });
    }
}

/**
 * Handles the mount 404 action
 * @param data - The bridge message data
 * @returns void
 */
function handleMount404(data: Extract<BridgeMessage, { action: "mount404" }>) {
    const el = document.getElementById(data.mountId);
    if (el) {
        mount(el, "FailureToast404", {});
    }
}

/**
 * Handles the safe unmount action
 * @param el - The element to unmount
 * @returns void
 */
function safeUnmount(el: HTMLElement) {
    try {
        unmount(el);
    } catch (err) {
        console.error("Error unmounting:", err);
    }
}

/**
 * Handles the safe unmount and remove action
 * @param el - The element to unmount and remove
 * @returns void
 */
function safeUnmountAndRemove(el: HTMLElement) {
    safeUnmount(el);
    try {
        el.remove();
    } catch (err) {
        console.error("Error removing element:", err);
    }
}

/**
 * Posts the validation message
 * @param event - The event to post
 * @param product - The product to post
 * @returns void
 */
function postValidationMessage(event: string, product: any) {
    window.postMessage(
        {
            source: "ecolens",
            channel: "ui",
            event,
            product,
        },
        "*"
    );
}

/**
 * Handles the bridge message event
 * @returns void
 */
window.addEventListener("message", handleBridgeMessage);

/**
 * Handles the ready event
 * @returns void
 */
try {
    window.postMessage(
        { source: "ecolens", channel: "ui", event: "ready" },
        "*"
    );
} catch {}
