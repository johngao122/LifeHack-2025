import {
    ScreenshotMessages,
    captureActiveTabScreenshot,
} from "./utils/screenshot.js";
import { getProductInfo, getRecommendations } from "./utils/api.js";

/**
 * Handles messages to analyze a screenshot.
 * @param {any} req - The request object
 * @param {any} _sender - The sender object
 * @param {any} sendResponse - The sendResponse function
 * @returns {boolean} Whether the message was handled
 */
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req?.action === "analyzeScreenshot") {
        (async () => {
            try {
                const { base64Data, pageUrl } = req;
                if (!base64Data || !pageUrl) throw new Error("Missing inputs");

                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
                if (!apiBaseUrl)
                    throw new Error("VITE_API_BASE_URL not configured");

                const r = await fetch(`${apiBaseUrl}/analyze_screenshot`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        screenshot_data: base64Data,
                        page_url: pageUrl,
                    }),
                });
                const result = await r.json();
                if (!r.ok || !result?.success) {
                    throw new Error(
                        result?.error || `HTTP ${r.status} ${r.statusText}`
                    );
                }

                const products_found = result.analysis?.products_found ?? [];

                const products = [];
                for (const p of products_found) {
                    if (p?.confidence > 0.7 && p?.name) {
                        products.push({
                            name: p.name,
                            cleanedName: p.name,
                            confidence: p.confidence,
                            source: `ai-screenshot${
                                p.brand ? ` (${p.brand})` : ""
                            }`,
                        });
                    }
                }

                sendResponse({ ok: true, products });
            } catch (e) {
                sendResponse({ ok: false, error: String(e) });
            }
        })();
        return true;
    }
});

/**
 * Handles messages from the popup to fetch green score data.
 * @param {any} message - The message object
 * @param {any} _sender - The sender object
 * @param {any} sendResponse - The sendResponse function
 * @returns {boolean} Whether the message was handled
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "fetchGreenScoreData") {
        (async () => {
            try {
                const { product } = message as {
                    product: {
                        name: string;
                        cleanedName: string;
                        confidence?: number;
                        source?: string;
                    };
                };

                if (!product?.cleanedName) {
                    throw new Error("Missing product.cleanedName");
                }

                const productData = await getProductInfo(product.cleanedName);
                const topCategories = productData.categories.slice(0, 3);
                const recommendations = await getRecommendations(topCategories);

                await chrome.storage.local.set({
                    detectedProduct: {
                        name: product.cleanedName,
                        originalName: product.name,
                        confidence: product.confidence,
                        source: product.source,
                        timestamp: Date.now(),
                    },
                    productData,
                    recommendations,
                });

                sendResponse({ ok: true });
            } catch (e: any) {
                const msg = e?.message || String(e);
                sendResponse({
                    ok: false,
                    code: /No product data received|404/.test(msg)
                        ? 404
                        : undefined,
                    error: msg,
                });
            }
        })();
        return true;
    }

    /**
     * Handles messages to open the report tab.
     * @param {any} message - The message object
     * @param {any} _sender - The sender object
     * @param {any} sendResponse - The sendResponse function
     * @returns {boolean} Whether the message was handled
     */
    if (message.action === "openReportTab") {
        const reportUrl = chrome.runtime.getURL("report.html");
        chrome.tabs
            .create({ url: reportUrl })
            .then((tab) => {
                sendResponse({ success: true, tabId: tab.id });
            })
            .catch((error) => {
                console.error(
                    "[EcoLens Background] Error creating tab:",
                    error
                );
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }

    /**
     * Handles messages to capture a screenshot.
     * @param {any} message - The message object
     * @param {any} _sender - The sender object
     * @param {any} sendResponse - The sendResponse function
     * @returns {boolean} Whether the message was handled
     */
    if (message.action === ScreenshotMessages.CAPTURE_SCREENSHOT) {
        console.log(
            "[EcoLens Background] Screenshot capture requested with options:",
            message.options
        );
        console.log("[EcoLens Background] Message sender:", _sender);

        captureActiveTabScreenshot(message.options || {})
            .then((result) => {
                console.log(
                    "[EcoLens Background] Screenshot capture completed:",
                    {
                        success: result.success,
                        hasDataUrl: !!result.dataUrl,
                        hasBase64Data: !!result.base64Data,
                        dataUrlLength: result.dataUrl?.length || 0,
                        base64Length: result.base64Data?.length || 0,
                        error: result.error,
                    }
                );

                if (result.success) {
                    console.log(
                        "[EcoLens Background] Sending successful response to content script"
                    );
                } else {
                    console.warn(
                        "[EcoLens Background] Screenshot capture failed:",
                        result.error
                    );
                }

                sendResponse({
                    action: ScreenshotMessages.SCREENSHOT_RESULT,
                    result,
                });
            })
            .catch((error) => {
                console.error(
                    "[EcoLens Background] Screenshot capture threw error:",
                    error
                );
                console.error("[EcoLens Background] Error details:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                });

                sendResponse({
                    action: ScreenshotMessages.SCREENSHOT_ERROR,
                    error: error.message || "Unknown screenshot capture error",
                });
            });

        return true;
    }
});
