/**
 * # EcoLens Content Script - Intelligent Product Detection System
 *
 * This content script implements sophisticated product detection and user interaction
 * for food sustainability analysis across e-commerce and food retailer websites.
 *
 * ## Architecture Overview:
 *
 * ### Core Components:
 * 1. **ProductScraper Class**: Multi-strategy product extraction engine
 * 2. **Product Detection Logic**: Page scanning and validation algorithms
 * 3. **User Interface System**: Dynamic popup and notification management
 * 4. **Communication Layer**: Message passing with background script and popup
 *
 * ### Product Detection Strategy:
 * The system uses AI-powered screenshot analysis as the primary method:
 *
 * #### Screenshot Analysis with GPT-4 Vision
 * - Captures page screenshot via Chrome extension API
 * - Analyzes visual content using OpenAI GPT-4 Vision
 * - Intelligently detects product pages vs. search results
 * - High accuracy product name extraction
 * - Confidence scoring based on visual analysis
 *
 * ### Product Name Cleaning Pipeline:
 * 1. **Brand/Retailer Removal**: Strips store names and common prefixes
 * 2. **Marketing Term Filtering**: Removes promotional language
 * 3. **Quantity Normalization**: Handles sizes, weights, and pack quantities
 * 4. **Capitalization Fixing**: Proper case for brand recognition
 * 5. **Blacklist Filtering**: Removes non-product terms
 *
 * ### User Interface States:
 * - **Detection Notification**: Subtle page-level product detection alerts
 * - **Product Validation Popup**: Interactive product confirmation interface
 * - **Edit Form**: Manual product name correction interface
 * - **Auto-close Management**: Prevents UI interference during user interaction
 *
 * ## Performance Considerations:
 * - Debounced scanning to prevent excessive processing
 * - Lazy loading of heavy analysis functions
 * - Efficient DOM querying with early termination
 * - Smart retry logic for dynamic content
 *
 * ## Integration Points:
 * - Background script for tab management
 * - Chrome storage for user preferences and data persistence
 * - Fuzzy matcher for food page detection
 * - API utilities for sustainability analysis
 *
 * ## Error Handling:
 * - Graceful degradation when screenshot analysis fails
 * - Clear user feedback for manual search option
 * - Comprehensive logging for debugging
 * - No automatic DOM scraping fallbacks (users can manually search)
 */

"use strict";

import { isFoodPage } from "./utils/fuzzyMatcher.js";

let __ecolensUiLoaded = false;
async function ensureUIBundle(): Promise<void> {
    if (__ecolensUiLoaded) return;
    await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.type = "module";
        s.src = chrome.runtime.getURL("ui-inject.js");
        s.onload = () => {
            __ecolensUiLoaded = true;
            try {
                console.log("[EcoLens] UI bundle loaded", {
                    hasEcoLensUI: Boolean((window as any).EcoLensUI),
                });
            } catch {}
            resolve();
        };
        (document.head || document.documentElement).appendChild(s);
    });
}

function createFixedTopRightMount(): HTMLDivElement {
    const mount = document.createElement("div");
    const style = mount.style;
    style.position = "fixed";
    style.top = "20px";
    style.right = "20px";
    style.zIndex = "2147483647";
    document.body.appendChild(mount);
    return mount;
}

async function cleanViaBackground(raw: string): Promise<string> {
    const res = await chrome.runtime.sendMessage({
        action: "cleanProductName",
        raw,
    });
    if (!res?.ok) throw new Error(res?.error || "clean failed");
    return res.cleaned;
}

async function analyzeInBackground(
    base64Data: string,
    pageUrl: string
): Promise<{
    products: Array<{
        name: string;
        cleanedName?: string;
        confidence: number;
        source?: string;
    }>;
    ok: boolean;
    error?: string;
}> {
    const res = await chrome.runtime.sendMessage({
        action: "analyzeScreenshot",
        base64Data,
        pageUrl,
    });
    if (!res) {
        return {
            ok: false,
            error: "No response from background",
            products: [],
        };
    }

    if (res.ok === false) {
        return {
            ok: false,
            error: res.error || "Background analysis failed",
            products: [],
        };
    }
    return {
        ok: true,
        products: Array.isArray(res.products) ? res.products : [],
    };
}

const ScreenshotMessages = {
    CAPTURE_SCREENSHOT: "captureScreenshot",
    SCREENSHOT_RESULT: "screenshotResult",
    SCREENSHOT_ERROR: "screenshotError",
} as const;

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

class ProductScraper {
    private loadingMountEl: HTMLDivElement | null = null;
    private overlayMountEl: HTMLDivElement | null = null;
    async scrapeProductsWithScreenshot(): Promise<ProductInfo[]> {
        try {
            console.log(
                "[EcoLens] Attempting screenshot-based product detection"
            );
            const screenshotProducts = await this.extractFromScreenshot();

            if (screenshotProducts.length > 0) {
                console.log(
                    "[EcoLens] Screenshot analysis successful with products:",
                    screenshotProducts
                );

                this.hideAnalysisLoadingPopup();
                return screenshotProducts;
            } else {
                console.log(
                    "[EcoLens] Screenshot analysis successful but found no products (likely search results or listing page)"
                );

                this.showAnalysisResultMessage("no-products");
                return screenshotProducts;
            }
        } catch (error) {
            console.warn("[EcoLens] Screenshot analysis failed:", error);

            this.showAnalysisResultMessage("error");

            if (error instanceof Error) {
                if (error.message.includes("activeTab permission")) {
                    console.warn(
                        "[EcoLens] Extension permissions issue - user may need to reload extension"
                    );
                } else if (
                    error.message.includes("Network error") ||
                    error.message.includes("backend server")
                ) {
                    console.warn("[EcoLens] Backend server connection issue");
                } else if (
                    error.message.includes("Chrome API") ||
                    error.message.includes("Chrome runtime")
                ) {
                    console.warn("[EcoLens] Chrome extension API issue");
                } else if (
                    error.message.includes("OpenAI") ||
                    error.message.includes("API key")
                ) {
                    console.warn("[EcoLens] AI service configuration issue");
                }
            }

            console.log(
                "[EcoLens] No fallback methods will be used. User can manually search via popup."
            );
            return [];
        }
    }

    private async extractFromScreenshot(): Promise<ProductInfo[]> {
        console.log("[EcoLens] Starting screenshot-based extraction");

        this.showAnalysisLoadingPopup();

        return new Promise((resolve, reject) => {
            console.log(
                "[EcoLens] Sending screenshot capture message to background script"
            );

            chrome.runtime.sendMessage(
                {
                    action: ScreenshotMessages.CAPTURE_SCREENSHOT,
                    options: { format: "jpeg", quality: 80 },
                },
                async (response) => {
                    console.log(
                        "[EcoLens] Received response from background script:",
                        response
                    );

                    if (chrome.runtime.lastError) {
                        const error = `Chrome runtime error: ${chrome.runtime.lastError.message}`;
                        console.error(
                            "[EcoLens] Runtime error occurred:",
                            chrome.runtime.lastError
                        );
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    if (!response) {
                        const error =
                            "No response received from background script";
                        console.error("[EcoLens]", error);
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    if (
                        response.action === ScreenshotMessages.SCREENSHOT_ERROR
                    ) {
                        const error = `Background script error: ${response.error}`;
                        console.error("[EcoLens]", error);
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result) {
                        const error = "Response missing result field";
                        console.error(
                            "[EcoLens]",
                            error,
                            "Full response:",
                            response
                        );
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result.success) {
                        const error = `Screenshot capture unsuccessful: ${
                            response.result.error || "Unknown error"
                        }`;
                        console.error("[EcoLens]", error);
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result.base64Data) {
                        const error =
                            "Screenshot captured but no base64 data received";
                        console.error(
                            "[EcoLens]",
                            error,
                            "Result:",
                            response.result
                        );
                        this.hideAnalysisLoadingPopup();
                        reject(new Error(error));
                        return;
                    }

                    console.log(
                        "[EcoLens] Screenshot capture successful, base64 data length:",
                        response.result.base64Data.length
                    );
                    console.log(
                        "[EcoLens] Sending screenshot to API for analysis"
                    );

                    try {
                        const products = await this.analyzeScreenshotWithAPI(
                            response.result.base64Data,
                            window.location.href
                        );

                        console.log(
                            "[EcoLens] API analysis completed, products found:",
                            products.length
                        );
                        resolve(products);
                    } catch (apiError) {
                        console.error(
                            "[EcoLens] API analysis failed:",
                            apiError
                        );
                        this.hideAnalysisLoadingPopup();
                        reject(apiError);
                    }
                }
            );
        });
    }

    private async analyzeScreenshotWithAPI(
        base64Data: string,
        pageUrl: string
    ): Promise<ProductInfo[]> {
        console.log("[EcoLens] Starting analysis via background worker");

        try {
            const bg = await analyzeInBackground(base64Data, pageUrl);

            if (!bg.ok) {
                const errMsg = bg.error || "Unknown background error";
                console.error(
                    "[EcoLens] Background analysis reported failure:",
                    errMsg
                );
                throw new Error(errMsg);
            }

            const products: ProductInfo[] = [];
            for (const p of bg.products) {
                try {
                    const cleaned =
                        p.cleanedName ?? (await cleanViaBackground(p.name));
                    products.push({
                        name: p.name,
                        cleanedName: cleaned,
                        confidence: p.confidence,
                        source: p.source || "ai-screenshot",
                    });
                } catch (e) {
                    console.warn(
                        "[EcoLens] Cleaning failed for product, skipping:",
                        p?.name,
                        e
                    );
                }
            }

            console.log(
                "[EcoLens] Background analysis completed, products found:",
                products.length
            );
            return products;
        } catch (error) {
            console.error("[EcoLens] Background analysis threw:", error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    public isFoodPage(): boolean {
        const title = document.title;
        return isFoodPage(title);
    }

    public showProductDetectionNotification(product: ProductInfo): void {
        try {
            try {
                const notification = document.createElement("div");
                notification.textContent = `🌱 EcoLens: ${product.cleanedName}`;

                const style = notification.style;
                style.position = "fixed";
                style.top = "20px";
                style.right = "20px";
                style.background = "#059669";
                style.color = "white";
                style.padding = "12px 16px";
                style.borderRadius = "8px";
                style.fontSize = "14px";
                style.zIndex = "2147483647";
                style.maxWidth = "300px";
                style.fontFamily = "system-ui, sans-serif";
                style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                style.opacity = "0";
                style.transition = "opacity 0.3s ease";
                style.pointerEvents = "none";

                document.body.appendChild(notification);

                setTimeout(() => {
                    style.opacity = "1";
                }, 100);

                setTimeout(() => {
                    style.opacity = "0";
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 4000);
            } catch (domError) {
                console.warn(
                    "[EcoLens] Could not create DOM notification:",
                    domError
                );
            }
        } catch (error) {
            console.error("[EcoLens] Error showing notification:", error);
        }
    }

    private loadingPopupId = "ecolens-analysis-loading";

    public showAnalysisLoadingPopup(): void {
        try {
            const existing = document.getElementById(this.loadingPopupId);
            if (existing) existing.remove();

            ensureUIBundle()
                .then(() => {
                    const mount = createFixedTopRightMount();
                    mount.id = this.loadingPopupId;
                    try {
                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "mount",
                                mountId: mount.id,
                                component: "LoadingToast",
                                props: {
                                    text: "Analyzing page...",
                                    timeoutMs: 15000,
                                },
                            },
                            "*"
                        );
                    } catch {}
                    this.loadingMountEl = mount;
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing loading popup:", error);
        }
    }

    public hideAnalysisLoadingPopup(): void {
        try {
            if (this.loadingMountEl) {
                try {
                    window.postMessage(
                        {
                            source: "ecolens",
                            channel: "ui",
                            action: "unmount",
                            mountId: this.loadingPopupId,
                        },
                        "*"
                    );
                } catch {}
                this.loadingMountEl.remove();
                this.loadingMountEl = null;
            } else {
                const el = document.getElementById(this.loadingPopupId);
                if (el) el.remove();
            }
        } catch (error) {
            console.error("[EcoLens] Error hiding loading popup:", error);
        }
    }

    public showAnalysisResultMessage(type: "no-products" | "error"): void {
        try {
            this.hideAnalysisLoadingPopup();
            ensureUIBundle()
                .then(() => {
                    const mount = createFixedTopRightMount();
                    const duration = type === "no-products" ? 3000 : 4000;
                    try {
                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "mount",
                                mountId: mount.id,
                                component: "ResultToast",
                                props: { type },
                            },
                            "*"
                        );
                    } catch {}
                    setTimeout(() => {
                        try {
                            window.postMessage(
                                {
                                    source: "ecolens",
                                    channel: "ui",
                                    action: "unmount",
                                    mountId: mount.id,
                                },
                                "*"
                            );
                        } catch {}
                        mount.remove();
                    }, duration);
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing result message:", error);
        }
    }

    public showProductDetectedPopup(products: ProductInfo[]): void {
        try {
            ensureUIBundle()
                .then(() => {
                    try {
                        const text = products?.[0]?.cleanedName || "Detected";
                        const selectors = [
                            "h1",
                            "[data-testid='product-title']",
                            ".product-title",
                        ];
                        for (const sel of selectors) {
                            const el = document.querySelector(sel) as any;
                            if (!el || el.__ecolensChipMounted) continue;
                            const mount = document.createElement("span");
                            mount.setAttribute(
                                "data-ecolens-component",
                                "ProductChip"
                            );
                            mount.setAttribute(
                                "data-ecolens-props",
                                JSON.stringify({ text })
                            );
                            el.insertAdjacentElement("afterend", mount);
                            try {
                                window.postMessage(
                                    {
                                        source: "ecolens",
                                        channel: "ui",
                                        action: "placeholders",
                                    },
                                    "*"
                                );
                            } catch {}
                            el.__ecolensChipMounted = true;
                            break;
                        }
                    } catch {}

                    if (this.overlayMountEl) {
                        try {
                            if (this.overlayMountEl.id) {
                                window.postMessage(
                                    {
                                        source: "ecolens",
                                        channel: "ui",
                                        action: "unmount",
                                        mountId: this.overlayMountEl.id,
                                    },
                                    "*"
                                );
                            }
                        } catch {}
                        this.overlayMountEl.remove();
                        this.overlayMountEl = null;
                    }
                    const mount = document.createElement("div");
                    mount.id = `ecolens-mount-${Math.random()
                        .toString(36)
                        .slice(2)}`;
                    document.body.appendChild(mount);
                    this.overlayMountEl = mount;
                    try {
                        const onBridge = (e: MessageEvent) => {
                            const data: any = (e as any).data;
                            if (
                                !data ||
                                data.source !== "ecolens" ||
                                data.channel !== "ui"
                            )
                                return;
                            if (data.event === "validationYes") {
                                window.removeEventListener("message", onBridge);
                                try {
                                    this.proceedWithGreenScore(data.product);
                                } catch {}
                            } else if (data.event === "validationEdit") {
                            }
                        };
                        window.addEventListener("message", onBridge);

                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "mount",
                                mountId: mount.id,
                                component: "DetectedPopup",
                                props: {
                                    products,
                                },
                            },
                            "*"
                        );
                    } catch {}
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing product popup:", error);
        }
    }

    public showProductValidation(products: ProductInfo[]): void {
        try {
            ensureUIBundle()
                .then(() => {
                    if (!this.overlayMountEl) {
                        this.overlayMountEl = document.createElement("div");
                        document.body.appendChild(this.overlayMountEl);
                    }
                    const product = products[0];
                    try {
                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "mount",
                                mountId:
                                    this.overlayMountEl.id ||
                                    (this.overlayMountEl.id = `ecolens-mount-${Math.random()
                                        .toString(36)
                                        .slice(2)}`),
                                component: "ValidationCard",
                                props: {
                                    product,
                                    onYes: () =>
                                        this.proceedWithGreenScore(product),
                                    onEdit: () => {},
                                },
                            },
                            "*"
                        );
                    } catch {}
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing product validation:", error);
        }
    }

    private async proceedWithGreenScore(product: ProductInfo): Promise<void> {
        try {
            const popupToRemove = document.getElementById(
                "ecolens-product-popup"
            );
            if (popupToRemove) {
                const popupEl = document.getElementById("ecolens-popup");
                if (popupEl) {
                    popupEl.style.opacity = "0";
                    popupEl.style.transform = "translateX(-50%) scale(0.8)";
                }
                setTimeout(() => {
                    popupToRemove.remove();
                }, 300);
            }

            setTimeout(async () => {
                const spinnerStyle = document.createElement("style");
                spinnerStyle.textContent = `
                    @keyframes ecolens-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .ecolens-spinner {
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top: 2px solid white;
                        width: 16px;
                        height: 16px;
                        animation: ecolens-spin 1s linear infinite;
                        display: inline-block;
                        margin-right: 8px;
                        vertical-align: middle;
                    }
                `;
                document.head.appendChild(spinnerStyle);

                const analyzingMount = createFixedTopRightMount();
                try {
                    window.postMessage(
                        {
                            source: "ecolens",
                            channel: "ui",
                            action: "mountAnalyzing",
                            mountId:
                                analyzingMount.id ||
                                (analyzingMount.id = `ecolens-mount-${Math.random()
                                    .toString(36)
                                    .slice(2)}`),
                            props: { text: product.cleanedName },
                        },
                        "*"
                    );
                } catch {}

                try {
                    const { ok, code } = await chrome.runtime.sendMessage({
                        action: "fetchGreenScoreData",
                        product,
                    });

                    if (ok) {
                        setTimeout(() => {
                            try {
                                window.postMessage(
                                    {
                                        source: "ecolens",
                                        channel: "ui",
                                        action: "unmount",
                                        mountId: analyzingMount.id,
                                    },
                                    "*"
                                );
                            } catch {}
                            analyzingMount.remove();
                            chrome.runtime.sendMessage({
                                action: "openReportTab",
                            });
                        }, 200);
                        return;
                    }

                    try {
                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "unmount",
                                mountId: analyzingMount.id,
                            },
                            "*"
                        );
                    } catch {}
                    analyzingMount.remove();

                    if (code === 404) {
                        const failureMount = createFixedTopRightMount();
                        try {
                            window.postMessage(
                                {
                                    source: "ecolens",
                                    channel: "ui",
                                    action: "mount404",
                                    mountId:
                                        failureMount.id ||
                                        (failureMount.id = `ecolens-mount-${Math.random()
                                            .toString(36)
                                            .slice(2)}`),
                                },
                                "*"
                            );
                        } catch {}

                        setTimeout(() => {
                            try {
                                window.postMessage(
                                    {
                                        source: "ecolens",
                                        channel: "ui",
                                        action: "unmount",
                                        mountId: failureMount.id,
                                    },
                                    "*"
                                );
                            } catch {}
                            failureMount.remove();
                        }, 5000);
                        return;
                    }

                    setTimeout(() => {
                        chrome.runtime.sendMessage({ action: "openReportTab" });
                    }, 300);
                    return;
                } catch (apiError: any) {
                    console.error("[EcoLens] API Error caught:", apiError);
                    try {
                        window.postMessage(
                            {
                                source: "ecolens",
                                channel: "ui",
                                action: "unmount",
                                mountId: analyzingMount.id,
                            },
                            "*"
                        );
                    } catch {}
                    analyzingMount.remove();
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ action: "openReportTab" });
                    }, 300);
                    return;
                }
            }, 400);
        } catch (error) {
            console.error(
                "[EcoLens] Error proceeding with green score:",
                error
            );
        }
    }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "scrapeProducts") {
        const scraper = new ProductScraper();

        scraper
            .scrapeProductsWithScreenshot()
            .then((products) => {
                sendResponse({ products });
            })
            .catch((error) => {
                console.error(
                    "[EcoLens] Error in screenshot-based scraping:",
                    error
                );

                sendResponse({ products: [], error: String(error) });
            });

        return true;
    } else if (request.action === "updateAutoPopup") {
        autoPopupEnabled = request.enabled;
    }

    return true;
});

let lastUrl = location.href;
let retryCount = 0;
const maxRetries = 5;
let popupShownForUrl = new Set<string>();
let isProcessing = false;
let autoPopupEnabled = true;

const checkForProducts = async (currentUrl: string, isRetry = false) => {
    if (isProcessing) {
        return;
    }

    if (location.href !== currentUrl) {
        return;
    }

    if (popupShownForUrl.has(currentUrl)) {
        return;
    }

    popupShownForUrl.add(currentUrl);
    isProcessing = true;

    const scraper = new ProductScraper();
    if (scraper.isFoodPage()) {
        try {
            const products = await scraper.scrapeProductsWithScreenshot();

            if (products.length > 0) {
                if (location.href === currentUrl) {
                    sessionStorage.setItem(
                        "ecolens-products",
                        JSON.stringify(products)
                    );

                    try {
                        chrome.runtime
                            .sendMessage({
                                action: "productsScraped",
                                products,
                            })
                            .catch(() => {});
                    } catch (e) {
                        console.warn(
                            "[EcoLens] Could not send message to popup:",
                            e
                        );
                    }

                    if (autoPopupEnabled) {
                        try {
                            scraper.showProductDetectedPopup(products);
                        } catch (e) {
                            console.warn(
                                "[EcoLens] Could not show product popup:",
                                e
                            );
                        }
                    } else {
                    }
                }
            } else if (isRetry && retryCount < maxRetries) {
                retryCount++;

                popupShownForUrl.delete(currentUrl);
                setTimeout(() => {
                    isProcessing = false;
                    checkForProducts(currentUrl, true);
                }, 2000);
                return;
            } else if (!isRetry && products.length === 0) {
                const isShopee = window.location.hostname.includes("shopee");
                if (isShopee) {
                    retryCount = 0;

                    popupShownForUrl.delete(currentUrl);
                    setTimeout(() => {
                        isProcessing = false;
                        checkForProducts(currentUrl, true);
                    }, 2000);
                    return;
                } else {
                    popupShownForUrl.delete(currentUrl);
                }
            }
        } catch (screenshotError) {
            console.warn(
                "[EcoLens] Screenshot-based detection failed:",
                screenshotError
            );
            console.log(
                "[EcoLens] No fallback methods will be used. User can manually search via popup."
            );
        }
    }

    isProcessing = false;
};

new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter((mutation) => {
        return Array.from(mutation.addedNodes).every((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                return (
                    !element.id?.startsWith("ecolens-") &&
                    !element.querySelector?.('[id^="ecolens-"]')
                );
            }
            return true;
        });
    });

    if (relevantMutations.length === 0) {
        return;
    }

    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        retryCount = 0;

        popupShownForUrl.clear();

        const existingPopup = document.getElementById("ecolens-product-popup");
        if (existingPopup) {
            existingPopup.remove();
        }

        const loadingPopup = document.getElementById(
            "ecolens-analysis-loading"
        );
        if (loadingPopup) {
            loadingPopup.remove();
        }

        setTimeout(() => checkForProducts(url, true), 1000);
    } else {
        setTimeout(() => checkForProducts(url, false), 500);
    }
}).observe(document, { subtree: true, childList: true });

function initializeEcoLens() {
    if ((window as any).ecoLensInitialized) {
        return;
    }
    (window as any).ecoLensInitialized = true;

    try {
        chrome.storage.sync.get(["autoPopupEnabled"], (result) => {
            if (result.autoPopupEnabled !== undefined) {
                autoPopupEnabled = result.autoPopupEnabled;
            }

            try {
                const scraper = new ProductScraper();
                const isFoodPage = scraper.isFoodPage();

                if (isFoodPage) {
                    checkForProducts(window.location.href, false);
                }
            } catch (error) {
                console.error(
                    "[EcoLens] Error during product checking:",
                    error
                );
            }
        });
    } catch (error) {
        console.warn("[EcoLens] Could not load settings:", error);

        try {
            const scraper = new ProductScraper();
            const isFoodPage = scraper.isFoodPage();

            if (isFoodPage) {
                checkForProducts(window.location.href, false);
            }
        } catch (error) {
            console.error(
                "[EcoLens] Error during fallback initialization:",
                error
            );
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEcoLens);
} else {
    setTimeout(initializeEcoLens, 100);
}

setTimeout(initializeEcoLens, 3000);

export type { ProductInfo };
export { ProductScraper };
