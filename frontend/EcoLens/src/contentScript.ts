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

async function cleanViaBackground(raw: string): Promise<string> {
    const res = await chrome.runtime.sendMessage({
        action: "cleanProductName",
        raw,
    });
    if (!res?.ok) throw new Error(res?.error || "clean failed");
    return res.cleaned;
}

// Analyze screenshot via background service worker (delegates all heavy lifting)
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
    // Expect shape: { ok: boolean, products?: [...], error?: string }
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

        // Delegate heavy lifting (network + cleaning) to background service worker
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

            // Build ProductInfo[]; if background didn't provide cleanedName, fall back to background cleaner RPC
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
            // Remove any existing loading popup
            const existingLoading = document.getElementById(
                this.loadingPopupId
            );
            if (existingLoading) {
                existingLoading.remove();
            }

            // Create loading popup with direct styling (like showAnalysisResultMessage)
            const loadingPopup = document.createElement("div");
            loadingPopup.id = this.loadingPopupId;

            // Apply styles directly to container div
            const style = loadingPopup.style;
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
            style.opacity = "0"; // Start invisible
            style.transition = "opacity 0.3s ease";
            style.pointerEvents = "none";
            style.display = "flex";
            style.alignItems = "center";
            style.gap = "8px";

            // Add content with spinning icon
            loadingPopup.innerHTML = `
                <div style="animation: ecolens-spin 1s linear infinite; font-size: 16px;">🔍</div>
                <span>Analyzing page...</span>
            `;

            // Add CSS animation if not already added
            if (!document.getElementById("ecolens-loading-styles")) {
                const styleEl = document.createElement("style");
                styleEl.id = "ecolens-loading-styles";
                styleEl.textContent = `
                    @keyframes ecolens-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styleEl);
            }

            document.body.appendChild(loadingPopup);

            // Fade in - now targeting the correct element
            setTimeout(() => {
                style.opacity = "1";
            }, 100);

            // Safety timeout - remove after 15 seconds
            setTimeout(() => {
                this.hideAnalysisLoadingPopup();
            }, 15000);
        } catch (error) {
            console.error("[EcoLens] Error showing loading popup:", error);
        }
    }

    public hideAnalysisLoadingPopup(): void {
        try {
            const loadingPopup = document.getElementById(this.loadingPopupId);
            if (loadingPopup) {
                loadingPopup.style.opacity = "0";
                setTimeout(() => {
                    if (loadingPopup.parentNode) {
                        loadingPopup.parentNode.removeChild(loadingPopup);
                    }
                }, 300);
            }
        } catch (error) {
            console.error("[EcoLens] Error hiding loading popup:", error);
        }
    }

    public showAnalysisResultMessage(type: "no-products" | "error"): void {
        try {
            this.hideAnalysisLoadingPopup();

            const message =
                type === "no-products"
                    ? "No products detected"
                    : "Something went wrong, try again later";

            const icon = type === "no-products" ? "🤷" : "⚠️";
            const backgroundColor =
                type === "no-products" ? "#6b7280" : "#dc2626";
            const duration = type === "no-products" ? 3000 : 4000;

            const resultPopup = document.createElement("div");
            resultPopup.textContent = `${icon} EcoLens: ${message}`;

            const style = resultPopup.style;
            style.position = "fixed";
            style.top = "20px";
            style.right = "20px";
            style.background = backgroundColor;
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

            document.body.appendChild(resultPopup);

            setTimeout(() => {
                style.opacity = "1";
            }, 100);

            setTimeout(() => {
                style.opacity = "0";
                setTimeout(() => {
                    if (resultPopup.parentNode) {
                        resultPopup.parentNode.removeChild(resultPopup);
                    }
                }, 300);
            }, duration);
        } catch (error) {
            console.error("[EcoLens] Error showing result message:", error);
        }
    }

    public showProductDetectedPopup(products: ProductInfo[]): void {
        try {
            const existingPopup = document.getElementById(
                "ecolens-product-popup"
            );
            if (existingPopup) {
                existingPopup.remove();
            }

            const popup = document.createElement("div");
            popup.id = "ecolens-product-popup";
            popup.innerHTML = `
                    <div id="ecolens-backdrop" style="
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.2);
                        z-index: 2147483640;
                    "></div>
                    <div id="ecolens-popup" style="
                        position: fixed;
                        top: 16px;
                        left: 50%;
                        transform: translateX(-50%) scale(0.8);
                        z-index: 2147483650;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        border: 1px solid #e5e7eb;
                        padding: 16px;
                        min-width: 320px;
                        max-width: 448px;
                        font-family: system-ui, -apple-system, sans-serif;
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: pointer;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="flex-shrink: 0;">
                                <div id="ecolens-eye" style="
                                    font-size: 24px;
                                    animation: ecolens-wiggle 1.5s infinite;
                                    animation-delay: 2s;
                                ">👁️</div>
                            </div>
                            <div style="flex: 1;">
                                <p style="
                                    color: #047857;
                                    font-weight: 600;
                                    font-size: 14px;
                                    margin: 0;
                                ">Valid product${
                                    products.length > 1 ? "s" : ""
                                } detected</p>
                                <p style="
                                    color: #6b7280;
                                    font-size: 12px;
                                    margin: 4px 0 0 0;
                                ">Curious about ${
                                    products.length > 1
                                        ? "these products'"
                                        : "this product's"
                                } green score?</p>
                            </div>
                            <button id="ecolens-close" style="
                                color: #9ca3af;
                                font-size: 20px;
                                line-height: 1;
                                background: none;
                                border: none;
                                cursor: pointer;
                                padding: 0;
                                width: 24px;
                                height: 24px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: color 0.2s;
                            ">×</button>
                        </div>
                        <div style="
                            margin-top: 12px;
                            padding-top: 12px;
                            border-top: 1px solid #f3f4f6;
                        ">
                            <p style="
                                font-size: 12px;
                                color: #6b7280;
                                text-align: center;
                                margin: 0;
                            ">Click to find out more</p>
                        </div>
                    </div>
                `;

            const style = document.createElement("style");
            style.textContent = `
                    @keyframes ecolens-wiggle {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(10deg); }
                        75% { transform: rotate(-10deg); }
                    }
                `;
            document.head.appendChild(style);

            document.body.appendChild(popup);

            setTimeout(() => {
                const popupEl = document.getElementById("ecolens-popup");
                if (popupEl) {
                    popupEl.style.opacity = "1";
                    popupEl.style.transform = "translateX(-50%) scale(1)";
                }
            }, 100);

            const popupEl = document.getElementById("ecolens-popup");
            if (popupEl) {
                popupEl.addEventListener("mouseenter", () => {
                    popupEl.style.transform = "translateX(-50%) scale(1.05)";
                });
                popupEl.addEventListener("mouseleave", () => {
                    popupEl.style.transform = "translateX(-50%) scale(1)";
                });
            }

            const closePopup = () => {
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
            };

            document
                .getElementById("ecolens-close")
                ?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    closePopup();
                });

            document
                .getElementById("ecolens-backdrop")
                ?.addEventListener("click", closePopup);

            let autoCloseTimeout: NodeJS.Timeout;
            let isInteracting = false;

            const startAutoClose = () => {
                if (!isInteracting) {
                    autoCloseTimeout = setTimeout(closePopup, 8000);
                }
            };

            const stopAutoClose = () => {
                clearTimeout(autoCloseTimeout);
            };

            const setInteracting = (interacting: boolean) => {
                isInteracting = interacting;
                if (interacting) {
                    stopAutoClose();
                } else {
                    startAutoClose();
                }
            };

            startAutoClose();

            popupEl?.addEventListener("mouseenter", () => setInteracting(true));
            popupEl?.addEventListener("mouseleave", () =>
                setInteracting(false)
            );

            popupEl?.addEventListener("click", (e) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                if (target?.id === "ecolens-close") {
                    return;
                }
                setInteracting(true);
                this.showProductValidation(products, () => setInteracting);
            });
        } catch (error) {
            console.error("[EcoLens] Error showing product popup:", error);
        }
    }

    public showProductValidation(
        products: ProductInfo[],
        setInteracting?: (interacting: boolean) => void
    ): void {
        try {
            const existingPopup = document.getElementById("ecolens-popup");
            if (!existingPopup) {
                console.warn(
                    "[EcoLens] No existing popup found for validation"
                );
                return;
            }

            existingPopup.style.transform = "translateX(-50%) scale(0.95)";
            existingPopup.style.opacity = "0.7";

            setTimeout(() => {
                existingPopup.innerHTML = `
                        <div style="text-align: center;">
                            <div style="font-size: 32px; margin-bottom: 16px;">🔍</div>
                            <h3 style="
                                color: #047857;
                                font-weight: 600;
                                font-size: 16px;
                                margin: 0 0 12px 0;
                            ">Product Detected</h3>
                            <div style="
                                background: #f3f4f6;
                                border-radius: 8px;
                                padding: 12px;
                                margin: 12px 0;
                                border-left: 4px solid #059669;
                            ">
                                <p style="
                                    font-weight: 600;
                                    font-size: 14px;
                                    color: #1f2937;
                                    margin: 0;
                                ">${products[0].cleanedName}</p>
                            </div>
                            <p style="
                                color: #374151;
                                font-size: 14px;
                                margin: 16px 0 8px 0;
                                font-weight: 500;
                            ">Is this product correct?</p>
                            <div style="
                                background: #fef3c7;
                                border: 1px solid #f59e0b;
                                border-radius: 6px;
                                padding: 8px 12px;
                                margin: 12px 0 16px 0;
                            ">
                                <p style="
                                    font-size: 12px;
                                    color: #92400e;
                                    margin: 0;
                                    font-weight: 500;
                                ">💡 Tip: Try not to include quantities, sizes, or brand details</p>
                            </div>
                            <div style="display: flex; gap: 8px; justify-content: center;">
                                <button id="ecolens-yes" style="
                                    background: #059669;
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    padding: 8px 16px;
                                    font-size: 14px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                ">✓ Yes, continue</button>
                                <button id="ecolens-edit" style="
                                    background: #6b7280;
                                    color: white;
                                    border: none;
                                    border-radius: 6px;
                                    padding: 8px 16px;
                                    font-size: 14px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                ">✏️ Edit</button>
                            </div>
                        </div>
                    `;

                existingPopup.style.transform = "translateX(-50%) scale(1)";
                existingPopup.style.opacity = "1";

                const yesBtn = document.getElementById("ecolens-yes");
                const editBtn = document.getElementById("ecolens-edit");

                yesBtn?.addEventListener("mouseenter", () => {
                    yesBtn.style.background = "#047857";
                    yesBtn.style.transform = "scale(1.05)";
                });
                yesBtn?.addEventListener("mouseleave", () => {
                    yesBtn.style.background = "#059669";
                    yesBtn.style.transform = "scale(1)";
                });

                editBtn?.addEventListener("mouseenter", () => {
                    editBtn.style.background = "#4b5563";
                    editBtn.style.transform = "scale(1.05)";
                });
                editBtn?.addEventListener("mouseleave", () => {
                    editBtn.style.background = "#6b7280";
                    editBtn.style.transform = "scale(1)";
                });

                yesBtn?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.proceedWithGreenScore(products[0]);
                });

                editBtn?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.showProductEditForm(products[0], setInteracting);
                });
            }, 150);
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

                const successPopup = document.createElement("div");
                successPopup.innerHTML = `
                        <div style="
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #059669;
                            color: white;
                            padding: 12px 16px;
                            border-radius: 8px;
                            font-size: 14px;
                            z-index: 2147483647;
                            font-family: system-ui, sans-serif;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                            animation: ecolens-slide-in 0.3s ease;
                            display: flex;
                            align-items: center;
                        ">
                            <div class="ecolens-spinner"></div>
                            <span>🌱 Analyzing "${product.cleanedName}" Green Score...</span>
                        </div>
                    `;
                document.body.appendChild(successPopup);

                try {
                    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

                    const productResponse = await fetch(
                        `${apiBaseUrl}/product_info`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                product_name: product.cleanedName,
                            }),
                        }
                    );

                    if (!productResponse.ok) {
                        throw new Error(
                            `Product API request failed: ${productResponse.status}`
                        );
                    }

                    const rawProductDataArray = await productResponse.json();

                    if (
                        !rawProductDataArray ||
                        rawProductDataArray.length === 0
                    ) {
                        throw new Error("No product data received");
                    }

                    const rawProductData = rawProductDataArray[0];

                    const productData = {
                        id: rawProductData.id,
                        name: rawProductData.name,
                        environmentalScore:
                            rawProductData.environmental_score_data
                                .adjusted_score,
                        grade: rawProductData.environmental_score_data.overall_grade.toUpperCase(),
                        packagingScore:
                            rawProductData.environmental_score_data
                                .packaging_score,
                        categories: rawProductData.categories,
                        labels: rawProductData.labels,
                        carbonFootprint: {
                            totalCo2Per100g: Math.round(
                                rawProductData.environmental_score_data
                                    .agribalyse.co2_total * 100
                            ),
                            totalCo2PerKg: Math.round(
                                rawProductData.environmental_score_data
                                    .agribalyse.co2_total * 1000
                            ),
                            breakdown: {
                                agriculture: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_agriculture,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_agriculture /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                                consumption: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_consumption,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_consumption /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                                distribution: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_distribution,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_distribution /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                                packaging: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_packaging,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_packaging /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                                processing: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_processing,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_processing /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                                transportation: {
                                    value: rawProductData
                                        .environmental_score_data.agribalyse
                                        .co2_transportation,
                                    percentage:
                                        Math.round(
                                            (rawProductData
                                                .environmental_score_data
                                                .agribalyse.co2_transportation /
                                                rawProductData
                                                    .environmental_score_data
                                                    .agribalyse.co2_total) *
                                                1000
                                        ) / 10,
                                },
                            },
                        },
                        materialBreakdown: Object.entries(
                            rawProductData.environmental_score_data
                                .material_scores || {}
                        ).map(([key, material]: [string, any]) => {
                            const parseRecyclingCode = (code: string) => {
                                const PLASTIC_CODES: Record<number, string> = {
                                    1: "PET/PETE (Polyethylene Terephthalate)",
                                    2: "HDPE (High-Density Polyethylene)",
                                    3: "PVC (Polyvinyl Chloride)",
                                    4: "LDPE (Low-Density Polyethylene)",
                                    5: "PP (Polypropylene)",
                                    6: "PS (Polystyrene)",
                                    7: "Other Plastics",
                                };

                                const PAPER_CODES: Record<number, string> = {
                                    20: "Corrugated Cardboard",
                                    21: "Mixed Paper",
                                    22: "Paper",
                                    23: "Paperboard",
                                    81: "Paper/Plastic Composite",
                                    82: "Paper/Aluminum Composite",
                                    83: "Paper/Tinplate Composite",
                                    84: "Paper/Plastic/Aluminum Composite",
                                    85: "Paper/Plastic/Aluminum/Tinplate Composite",
                                };

                                const GLASS_CODES: Record<number, string> = {
                                    70: "Clear Glass",
                                    71: "Green Glass",
                                    72: "Brown Glass",
                                };

                                const METAL_CODES: Record<number, string> = {
                                    40: "Steel",
                                    41: "Aluminum",
                                };

                                const upperCode = code.toUpperCase();

                                if (upperCode === "CLEAR_GLASS") {
                                    return {
                                        codeNumber: 70,
                                        materialName: "Clear Glass",
                                    };
                                }
                                if (upperCode === "GREEN_GLASS") {
                                    return {
                                        codeNumber: 71,
                                        materialName: "Green Glass",
                                    };
                                }
                                if (upperCode === "BROWN_GLASS") {
                                    return {
                                        codeNumber: 72,
                                        materialName: "Brown Glass",
                                    };
                                }

                                if (
                                    upperCode.includes("PP_5") ||
                                    upperCode.includes("POLYPROPYLENE")
                                ) {
                                    return {
                                        codeNumber: 5,
                                        materialName: "PP (Polypropylene)",
                                    };
                                }
                                if (
                                    upperCode.includes("PET") ||
                                    upperCode.includes("PETE")
                                ) {
                                    return {
                                        codeNumber: 1,
                                        materialName:
                                            "PET/PETE (Polyethylene Terephthalate)",
                                    };
                                }
                                if (upperCode.includes("HDPE")) {
                                    return {
                                        codeNumber: 2,
                                        materialName:
                                            "HDPE (High-Density Polyethylene)",
                                    };
                                }
                                if (upperCode.includes("PVC")) {
                                    return {
                                        codeNumber: 3,
                                        materialName:
                                            "PVC (Polyvinyl Chloride)",
                                    };
                                }
                                if (upperCode.includes("LDPE")) {
                                    return {
                                        codeNumber: 4,
                                        materialName:
                                            "LDPE (Low-Density Polyethylene)",
                                    };
                                }
                                if (
                                    upperCode.includes("PS") ||
                                    upperCode.includes("POLYSTYRENE")
                                ) {
                                    return {
                                        codeNumber: 6,
                                        materialName: "PS (Polystyrene)",
                                    };
                                }

                                if (
                                    upperCode.includes("CORRUGATED") &&
                                    upperCode.includes("CARDBOARD")
                                ) {
                                    return {
                                        codeNumber: 20,
                                        materialName: "Corrugated Cardboard",
                                    };
                                }
                                if (
                                    upperCode.includes("NON_CORRUGATED") &&
                                    upperCode.includes("CARDBOARD")
                                ) {
                                    return {
                                        codeNumber: 21,
                                        materialName:
                                            "Non-Corrugated Cardboard",
                                    };
                                }
                                if (
                                    upperCode.includes("C_PAP") ||
                                    upperCode.includes("PAP")
                                ) {
                                    if (upperCode.includes("82")) {
                                        return {
                                            codeNumber: 82,
                                            materialName:
                                                "Paper/Aluminum Composite",
                                        };
                                    }
                                    if (upperCode.includes("81")) {
                                        return {
                                            codeNumber: 81,
                                            materialName:
                                                "Paper/Plastic Composite",
                                        };
                                    }
                                    if (upperCode.includes("20")) {
                                        return {
                                            codeNumber: 20,
                                            materialName:
                                                "Corrugated Cardboard",
                                        };
                                    }
                                    return {
                                        codeNumber: 22,
                                        materialName: "Paper",
                                    };
                                }

                                if (
                                    upperCode.includes("STEEL") ||
                                    upperCode.includes("FE")
                                ) {
                                    return {
                                        codeNumber: 40,
                                        materialName: "Steel",
                                    };
                                }
                                if (
                                    upperCode.includes("ALUMINUM") ||
                                    upperCode.includes("ALU")
                                ) {
                                    return {
                                        codeNumber: 41,
                                        materialName: "Aluminum",
                                    };
                                }

                                const numberMatch = code.match(/(\d+)/);
                                const codeNumber = numberMatch
                                    ? parseInt(numberMatch[1])
                                    : null;

                                if (codeNumber) {
                                    if (codeNumber >= 1 && codeNumber <= 7) {
                                        return {
                                            codeNumber,
                                            materialName:
                                                PLASTIC_CODES[codeNumber] ||
                                                "Unknown Plastic",
                                        };
                                    }
                                    if (codeNumber >= 20 && codeNumber <= 85) {
                                        return {
                                            codeNumber,
                                            materialName:
                                                PAPER_CODES[codeNumber] ||
                                                "Unknown Paper Product",
                                        };
                                    }
                                    if (codeNumber >= 70 && codeNumber <= 72) {
                                        return {
                                            codeNumber,
                                            materialName:
                                                GLASS_CODES[codeNumber] ||
                                                "Clear Glass",
                                        };
                                    }
                                    if (
                                        codeNumber === 40 ||
                                        codeNumber === 41
                                    ) {
                                        return {
                                            codeNumber,
                                            materialName:
                                                METAL_CODES[codeNumber] ||
                                                "Unknown Metal",
                                        };
                                    }
                                }

                                return {
                                    codeNumber: null,
                                    materialName: "Unknown Material",
                                };
                            };

                            const { codeNumber, materialName } =
                                parseRecyclingCode(key);

                            return {
                                key: key,
                                codeNumber,
                                materialName,
                                material: material.material,
                                score: material.environmental_score_material_score,
                                shape: material.shape.replace("en:", ""),
                                ratio: material.environmental_score_shape_ratio,
                            };
                        }),
                    };

                    const topCategories = productData.categories.slice(0, 3);

                    const recommendationsResponse = await fetch(
                        `${apiBaseUrl}/recommendations`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ categories: topCategories }),
                        }
                    );

                    if (!recommendationsResponse.ok) {
                        throw new Error(
                            `Recommendations API request failed: ${recommendationsResponse.status}`
                        );
                    }

                    chrome.storage.local.set({
                        detectedProduct: {
                            name: product.cleanedName,
                            originalName: product.name,
                            confidence: product.confidence,
                            source: product.source,
                            timestamp: Date.now(),
                        },
                    });

                    setTimeout(() => {
                        successPopup.remove();
                        chrome.runtime.sendMessage({
                            action: "openReportTab",
                        });
                    }, 2000);
                } catch (apiError: any) {
                    console.error("[EcoLens] API Error caught:", {
                        message: apiError.message,
                        stack: apiError.stack,
                        name: apiError.name,
                        error: apiError,
                    });

                    successPopup.remove();

                    if (apiError.message && apiError.message.includes("404")) {
                        const failurePopup = document.createElement("div");
                        failurePopup.innerHTML = `
                            <div style="
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                background: #dc2626;
                                color: white;
                                padding: 16px 20px;
                                border-radius: 8px;
                                font-size: 14px;
                                z-index: 2147483647;
                                font-family: system-ui, sans-serif;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                max-width: 320px;
                                line-height: 1.4;
                            ">
                                <div style="display: flex; align-items: flex-start; gap: 8px;">
                                    <span style="font-size: 16px;">❌</span>
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 4px;">
                                            Unable to find product data
                                        </div>
                                        <div style="font-size: 12px; opacity: 0.9;">
                                            Try manually searching with broader terms
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(failurePopup);

                        setTimeout(() => {
                            failurePopup.remove();
                        }, 5000);
                    } else {
                        chrome.storage.local.set({
                            detectedProduct: {
                                name: product.cleanedName,
                                originalName: product.name,
                                confidence: product.confidence,
                                source: product.source,
                                timestamp: Date.now(),
                            },
                        });

                        setTimeout(() => {
                            chrome.runtime.sendMessage({
                                action: "openReportTab",
                            });
                        }, 1000);
                    }
                }
            }, 400);
        } catch (error) {
            console.error(
                "[EcoLens] Error proceeding with green score:",
                error
            );
        }
    }

    private showProductEditForm(
        product: ProductInfo,
        setInteracting?: (interacting: boolean) => void
    ): void {
        try {
            const existingPopup = document.getElementById("ecolens-popup");
            if (!existingPopup) return;

            existingPopup.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 16px;">✏️</div>
                        <h3 style="
                            color: #047857;
                            font-weight: 600;
                            font-size: 16px;
                            margin: 0 0 12px 0;
                        ">Edit Product Name</h3>
                        <input id="ecolens-edit-input" type="text" value="${product.cleanedName}" style="
                            width: 100%;
                            border: 2px solid #d1d5db;
                            border-radius: 6px;
                            padding: 8px 12px;
                            font-size: 14px;
                            margin: 12px 0;
                            font-family: system-ui, sans-serif;
                            outline: none;
                            transition: border-color 0.2s;
                        ">
                        <div style="
                            background: #fef3c7;
                            border: 1px solid #f59e0b;
                            border-radius: 6px;
                            padding: 8px 12px;
                            margin: 12px 0 16px 0;
                        ">
                            <p style="
                                font-size: 12px;
                                color: #92400e;
                                margin: 0;
                                font-weight: 500;
                            ">💡 Remove quantities (2kg, 500ml), sizes (large, small), and unnecessary brand details</p>
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button id="ecolens-save" style="
                                background: #059669;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                padding: 8px 16px;
                                font-size: 14px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">💾 Save & Continue</button>
                            <button id="ecolens-cancel" style="
                                background: #6b7280;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                padding: 8px 16px;
                                font-size: 14px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">↩️ Cancel</button>
                        </div>
                    </div>
                `;

            const input = document.getElementById(
                "ecolens-edit-input"
            ) as HTMLInputElement;
            input?.focus();
            input?.select();

            input?.addEventListener("click", (e) => {
                e.stopPropagation();
            });

            input?.addEventListener("focus", (e) => {
                e.stopPropagation();
                input.style.borderColor = "#059669";
                setInteracting?.(true);
            });
            input?.addEventListener("blur", () => {
                input.style.borderColor = "#d1d5db";
                setInteracting?.(false);
            });
            input?.addEventListener("input", (e) => {
                e.stopPropagation();
                setInteracting?.(true);
            });

            document
                .getElementById("ecolens-save")
                ?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const newName =
                        (
                            document.getElementById(
                                "ecolens-edit-input"
                            ) as HTMLInputElement
                        )?.value || product.cleanedName;
                    const updatedProduct = {
                        ...product,
                        cleanedName: newName,
                    };
                    this.proceedWithGreenScore(updatedProduct);
                });

            document
                .getElementById("ecolens-cancel")
                ?.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.showProductValidation([product], setInteracting);
                });
        } catch (error) {
            console.error("[EcoLens] Error showing edit form:", error);
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
