"use strict";

import { isFoodPage } from "./utils/fuzzyMatcher.js";

let LAST_URL = location.href;
let RETRY_COUNT = 0;
const MAX_RETRIES = 5;
let POPUP_SHOWN_FOR_URL = new Set<string>();
let IS_PROCESSING = false;
let AUTO_POPUP_ENABLED = true;

const ANALYSIS_COOLDOWN_MS = 30000;
const LAST_ANALYSIS_AT = new Map<string, number>();

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

let __ECOLENS_UI_LOADED = false;
async function ensureUIBundle(): Promise<void> {
    if (__ECOLENS_UI_LOADED) return;
    await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.type = "module";
        s.src = chrome.runtime.getURL("ui-inject.js");
        s.onload = () => {
            __ECOLENS_UI_LOADED = true;
            resolve();
        };
        (document.head || document.documentElement).appendChild(s);
    });
}

const ScreenshotMessages = {
    CAPTURE_SCREENSHOT: "captureScreenshot",
    SCREENSHOT_RESULT: "screenshotResult",
    SCREENSHOT_ERROR: "screenshotError",
} as const;

const Z_INDEX_MAX = "2147483647";
const TOAST_OFFSET_PX = "20px";

/**
 * Initializes the EcoLens extension.
 * @returns {void}
 */
async function initializeEcoLens() {
    if ((window as any).ecoLensInitialized) {
        return;
    }
    (window as any).ecoLensInitialized = true;

    try {
        chrome.storage.sync.get(["autoPopupEnabled"], async (result) => {
            if (result.autoPopupEnabled !== undefined) {
                AUTO_POPUP_ENABLED = result.autoPopupEnabled;
            }

            try {
                const scraper = new ProductScraper();
                const isFoodPage = await scraper.isFoodPage();

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
            const isFoodPage = await scraper.isFoodPage();

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

/**
 * Posts a message to the window.
 * @param {any} payload - The payload to post
 * @returns {void}
 */
function postMessage(payload: any): void {
    window.postMessage(payload, "*");
}

/**
 * Creates and appends a mount point div element to the document body.
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.id] - Optional ID to assign to the mount element
 * @param {boolean} [options.fixedTopRight=false] - Whether to position the mount fixed in the top-right corner
 * @returns {HTMLDivElement} The created mount element
 */
function createMount({
    id,
    fixedTopRight = false,
}: { id?: string; fixedTopRight?: boolean } = {}): HTMLDivElement {
    const mount = document.createElement("div");
    if (id) mount.id = id;
    if (fixedTopRight) {
        const style = mount.style;
        style.position = "fixed";
        style.top = TOAST_OFFSET_PX;
        style.right = TOAST_OFFSET_PX;
        style.zIndex = Z_INDEX_MAX;
    }
    document.body.appendChild(mount);
    return mount;
}

/**
 * Unmounts and removes a UI component.
 *
 * @param {HTMLElement | null} el - The element to unmount and remove
 * @returns {void}
 */
function unmountAndRemove(el?: HTMLElement | null): void {
    if (!el) return;
    try {
        postMessage({
            source: "ecolens",
            channel: "ui",
            action: "unmount",
            mountId: el.id,
        });
    } catch {}
    el.remove();
}

/**
 * Creates a fixed top-right mount element.
 *
 * @returns {HTMLDivElement} The created mount element
 */
function createFixedTopRightMount(): HTMLDivElement {
    const mount = document.createElement("div");
    const style = mount.style;
    style.position = "fixed";
    style.top = TOAST_OFFSET_PX;
    style.right = TOAST_OFFSET_PX;
    style.zIndex = Z_INDEX_MAX;
    document.body.appendChild(mount);
    return mount;
}

/**
 * Analyzes a screenshot via the background script.
 *
 * @param {string} base64Data - The base64 data of the screenshot
 * @param {string} pageUrl - The URL of the page
 * @returns {Promise<{products: Array<{name: string, cleanedName?: string, confidence: number, source?: string}>, ok: boolean, error?: string}>} The analysis result
 * @throws {Error} If the background script fails to analyze the screenshot
 */
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

/**
 * Product scraper class.
 *
 * @class ProductScraper
 * @constructor
 * @param {string} base64Data - The base64 data of the screenshot
 * @param {string} pageUrl - The URL of the page
 */
class ProductScraper {
    private loadingMountEl: HTMLDivElement | null = null;
    private overlayMountEl: HTMLDivElement | null = null;

    /**
     * Scrapes products with screenshot.
     *
     * @returns {Promise<ProductInfo[]>} The products found
     */
    async scrapeProductsWithScreenshot(
        showUI: boolean = true
    ): Promise<ProductInfo[]> {
        try {
            console.log(
                "[EcoLens] Attempting screenshot-based product detection"
            );
            const screenshotProducts = await this.extractFromScreenshot(showUI);

            if (screenshotProducts.length > 0) {
                console.log(
                    "[EcoLens] Screenshot analysis successful with products:",
                    screenshotProducts
                );

                if (showUI) {
                    this.hideAnalysisLoadingPopup();
                }
                return screenshotProducts;
            } else {
                console.log(
                    "[EcoLens] Screenshot analysis successful but found no products (likely search results or listing page)"
                );

                if (showUI) {
                    this.showAnalysisResultMessage("no-products");
                }
                return screenshotProducts;
            }
        } catch (error) {
            console.warn("[EcoLens] Screenshot analysis failed:", error);

            if (showUI) {
                this.showAnalysisResultMessage("error");
            }

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

    /**
     * Extracts products from screenshot.
     *
     * @returns {Promise<ProductInfo[]>} The products found
     */
    private async extractFromScreenshot(
        showUI: boolean = true
    ): Promise<ProductInfo[]> {
        if (showUI) {
            this.showAnalysisLoadingPopup();
        }

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: ScreenshotMessages.CAPTURE_SCREENSHOT,
                    options: { format: "jpeg", quality: 80 },
                },
                async (response) => {
                    if (chrome.runtime.lastError) {
                        const error = `Chrome runtime error: ${chrome.runtime.lastError.message}`;
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    if (!response) {
                        const error =
                            "No response received from background script";
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    if (
                        response.action === ScreenshotMessages.SCREENSHOT_ERROR
                    ) {
                        const error = `Background script error: ${response.error}`;
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result) {
                        const error = "Response missing result field";
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result.success) {
                        const error = `Screenshot capture unsuccessful: ${
                            response.result.error || "Unknown error"
                        }`;
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    if (!response.result.base64Data) {
                        const error =
                            "Screenshot captured but no base64 data received";
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(new Error(error));
                        return;
                    }

                    try {
                        const products = await this.analyzeScreenshotWithAPI(
                            response.result.base64Data,
                            window.location.href
                        );

                        resolve(products);
                    } catch (apiError) {
                        if (showUI) {
                            this.hideAnalysisLoadingPopup();
                        }
                        reject(apiError);
                    }
                }
            );
        });
    }

    /**
     * Analyzes a screenshot with the background script.
     *
     * @param {string} base64Data - The base64 data of the screenshot
     * @param {string} pageUrl - The URL of the page
     * @returns {Promise<ProductInfo[]>} The products found
     */
    private async analyzeScreenshotWithAPI(
        base64Data: string,
        pageUrl: string
    ): Promise<ProductInfo[]> {
        try {
            const bg = await analyzeInBackground(base64Data, pageUrl);

            if (!bg.ok) {
                const errMsg = bg.error || "Unknown background error";
                throw new Error(errMsg);
            }

            const products: ProductInfo[] = [];
            for (const p of bg.products) {
                if (p.cleanedName) {
                    products.push({
                        name: p.name,
                        cleanedName: p.cleanedName,
                        confidence: p.confidence,
                        source: p.source || "ai-screenshot",
                    });
                } else {
                    console.warn(
                        "[EcoLens] Product missing cleanedName, skipping:",
                        p?.name
                    );
                }
            }

            return products;
        } catch (error) {
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    /**
     * Checks if the current page is a food page.
     *
     * @returns {boolean} Whether the page is a food page
     */
    public async isFoodPage(): Promise<boolean> {
        const title = document.title;
        return await isFoodPage(title);
    }

    /**
     * Shows a product detection notification.
     *
     * @param {ProductInfo} product - The product to show the notification for
     */
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

    /**
     * Shows a loading popup.
     * @returns {void}
     */
    public showAnalysisLoadingPopup(): void {
        try {
            const existing = document.getElementById(this.loadingPopupId);
            if (existing) existing.remove();

            ensureUIBundle()
                .then(() => {
                    const mount = createMount({
                        id: this.loadingPopupId,
                        fixedTopRight: true,
                    });
                    postMessage({
                        source: "ecolens",
                        channel: "ui",
                        action: "mount",
                        mountId: mount.id,
                        component: "LoadingToast",
                        props: { text: "Analyzing page...", timeoutMs: 15000 },
                    });
                    this.loadingMountEl = mount;
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing loading popup:", error);
        }
    }

    /**
     * Hides the analysis loading popup.
     * @returns {void}
     */
    public hideAnalysisLoadingPopup(): void {
        try {
            if (this.loadingMountEl) {
                postMessage({
                    source: "ecolens",
                    channel: "ui",
                    action: "unmount",
                    mountId: this.loadingPopupId,
                });
                this.loadingMountEl.remove();
                this.loadingMountEl = null;
                return;
            }
            const el = document.getElementById(this.loadingPopupId);
            if (el) el.remove();
        } catch (error) {
            console.error("[EcoLens] Error hiding loading popup:", error);
        }
    }

    /**
     * Shows a result message depending on the type of result.
     * @param {string} type - The type of result message
     * @returns {void}
     */
    public showAnalysisResultMessage(type: "no-products" | "error"): void {
        try {
            this.hideAnalysisLoadingPopup();
            ensureUIBundle()
                .then(() => {
                    const mount = createMount({ fixedTopRight: true });
                    const duration = type === "no-products" ? 3000 : 4000;
                    postMessage({
                        source: "ecolens",
                        channel: "ui",
                        action: "mount",
                        mountId: mount.id,
                        component: "ResultToast",
                        props: { type },
                    });
                    setTimeout(() => {
                        unmountAndRemove(mount);
                    }, duration);
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing result message:", error);
        }
    }

    /**
     * Shows a product detected popup
     * @param {ProductInfo[]} products - The products to show the popup for
     * @returns {void}
     */
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
                                postMessage({
                                    source: "ecolens",
                                    channel: "ui",
                                    action: "placeholders",
                                });
                            } catch {}
                            el.__ecolensChipMounted = true;
                            break;
                        }
                    } catch {}

                    if (this.overlayMountEl) {
                        if (this.overlayMountEl.id) {
                            postMessage({
                                source: "ecolens",
                                channel: "ui",
                                action: "unmount",
                                mountId: this.overlayMountEl.id,
                            });
                        }
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

                        postMessage({
                            source: "ecolens",
                            channel: "ui",
                            action: "mount",
                            mountId: mount.id,
                            component: "DetectedPopup",
                            props: { products },
                        });
                    } catch {}
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing product popup:", error);
        }
    }

    /**
     * Shows a product validation popup.
     * @param {ProductInfo[]} products - The products to show the popup for
     * @returns {void}
     */
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
                        postMessage({
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
                        });
                    } catch {}
                })
                .catch((e) =>
                    console.warn("[EcoLens] UI bundle load failed", e)
                );
        } catch (error) {
            console.error("[EcoLens] Error showing product validation:", error);
        }
    }

    /**
     * Proceeds with the green score calculation and opens the report tab.
     * @param {ProductInfo} product - The product to proceed with
     * @returns {Promise<void>}
     */
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
                const analyzingMount = createMount({ fixedTopRight: true });
                postMessage({
                    source: "ecolens",
                    channel: "ui",
                    action: "mountAnalyzing",
                    mountId:
                        analyzingMount.id ||
                        (analyzingMount.id = `ecolens-mount-${Math.random()
                            .toString(36)
                            .slice(2)}`),
                    props: { text: product.cleanedName },
                });

                try {
                    const { ok, code } = await chrome.runtime.sendMessage({
                        action: "fetchGreenScoreData",
                        product,
                    });

                    if (ok) {
                        setTimeout(() => {
                            unmountAndRemove(analyzingMount);
                            chrome.runtime.sendMessage({
                                action: "openReportTab",
                            });
                        }, 200);
                        return;
                    }

                    unmountAndRemove(analyzingMount);

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
                    unmountAndRemove(analyzingMount);
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

/**
 * Handles messages from the background script.
 * @param {any} request - The request object
 * @param {any} _sender - The sender object
 * @param {any} sendResponse - The sendResponse function
 * @returns {boolean} Whether the message was handled
 */
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
        AUTO_POPUP_ENABLED = request.enabled;
    }

    return true;
});

/**
 * Checks for products on the current page.
 * @param {string} currentUrl - The current URL
 * @param {boolean} isRetry - Whether this is a retry
 * @returns {Promise<void>}
 */
const checkForProducts = async (currentUrl: string, isRetry = false) => {
    if (IS_PROCESSING) {
        return;
    }

    if (location.href !== currentUrl) {
        return;
    }

    if (POPUP_SHOWN_FOR_URL.has(currentUrl)) {
        return;
    }

    const lastAt = LAST_ANALYSIS_AT.get(currentUrl) || 0;
    const now = Date.now();
    if (now - lastAt < ANALYSIS_COOLDOWN_MS) {
        return;
    }

    POPUP_SHOWN_FOR_URL.add(currentUrl);
    IS_PROCESSING = true;
    LAST_ANALYSIS_AT.set(currentUrl, now);

    const scraper = new ProductScraper();
    if (await scraper.isFoodPage()) {
        try {
            const products = await scraper.scrapeProductsWithScreenshot(
                AUTO_POPUP_ENABLED
            );

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

                    if (AUTO_POPUP_ENABLED) {
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
            } else if (isRetry && RETRY_COUNT < MAX_RETRIES) {
                RETRY_COUNT++;

                POPUP_SHOWN_FOR_URL.delete(currentUrl);
                setTimeout(() => {
                    IS_PROCESSING = false;
                    checkForProducts(currentUrl, true);
                }, 2000);
                return;
            } else if (!isRetry && products.length === 0) {
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

    IS_PROCESSING = false;
};

/**
 * Observes mutations on the document and checks for products.
 * @param {MutationRecord[]} mutations - The mutations to observe
 * @returns {void}
 */
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
    if (url !== LAST_URL) {
        LAST_URL = url;
        RETRY_COUNT = 0;

        POPUP_SHOWN_FOR_URL.clear();

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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEcoLens);
} else {
    setTimeout(initializeEcoLens, 100);
}

setTimeout(initializeEcoLens, 3000);

export type { ProductInfo };
export { ProductScraper };
