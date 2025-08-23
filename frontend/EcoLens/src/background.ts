/**
 * # EcoLens Background Service Worker
 *
 * This service worker handles extension-level coordination and tab management.
 * It operates in the background to provide seamless integration between
 * content scripts and the extension popup.
 *
 * ## Responsibilities:
 * - Tab creation for sustainability reports
 * - Screenshot capture for AI-powered product analysis
 * - Message routing between extension components
 * - Extension lifecycle management
 *
 * ## Message Handling:
 * The service worker listens for messages from content scripts and popup:
 * - `openReportTab`: Creates new tab with sustainability report
 * - `captureScreenshot`: Captures screenshot of active tab for AI analysis
 * - Future messages can be added here for additional functionality
 *
 * ## Architecture Notes:
 * Uses Chrome Extension Manifest V3 service worker pattern.
 * Maintains minimal state to ensure reliability across browser sessions.
 */

import {
    ScreenshotMessages,
    captureActiveTabScreenshot,
} from "./utils/screenshot.js";
import { getProductInfo, getRecommendations } from "./utils/api.js";

function cleanProductName(rawName: string): string {
    if (!rawName) return "";

    let cleaned = rawName;

    cleaned = cleaned

        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")

        .replace(
            /\b(amazon|walmart|target|shopee|lazada|fair\s*price|ntuc|cold\s*storage|giant|carrefour|tesco|sainsbury|asda|kroger|safeway)\b/gi,
            ""
        )
        .replace(/\b(com|www|net|org|store|shop|market)\b/gi, "")

        .replace(
            /\b(grocery|food|gourmet|artisan|premium|quality|grade|choice|select|prime|deluxe|luxury)\b/gi,
            ""
        )
        .replace(
            /\b(homemade|handmade|fresh|natural|organic|local|imported|authentic|traditional)\b/gi,
            ""
        )

        .replace(
            /\b\d+[\s-]?(g|kg|ml|l|oz|lb|lbs|pcs|pc|pack|ct|count|set|serving|servings|pieces?)\b/gi,
            ""
        )

        .replace(/\d+%/g, "")

        .replace(
            /\b(size|small|medium|large|xl|xxl|s|m|l)[\s:]*[a-z0-9]*\b/gi,
            ""
        )

        .replace(/\b(color|colour)[\s:]*[a-z]+\b/gi, "")

        .replace(/\b(model|version|v\.?)\s*[a-z0-9\-_.]+/gi, "")

        .replace(
            /\b(new|sale|hot|best|top|popular|featured|limited|special|exclusive|signature|classic|original)\b/gi,
            ""
        )

        .replace(
            /\b(raw|cooked|baked|fried|grilled|roasted|steamed|boiled|smoked|cured)\b/gi,
            ""
        )

        .replace(
            /\b(gluten-free|dairy-free|sugar-free|fat-free|low-fat|low-sodium|low-sugar|low-calorie)\b/gi,
            ""
        )
        .replace(
            /\b(reduced|zero|no|less)[\s-]+(fat|sodium|sugar|calories?|carbs?)\b/gi,
            ""
        )

        .replace(
            /\b(calories?|protein|carbs?|carbohydrates?|fiber|fibre|vitamin|mineral|supplement)\b/gi,
            ""
        )

        .replace(
            /\b(shipping|delivery|return|warranty|guarantee|add\s+to\s+cart|buy\s+now)\b/gi,
            ""
        )

        .replace(
            /\b(country|place|origin|dietary|halal|kosher|vegan|vegetarian)\b/gi,
            ""
        )

        .replace(/\b(the|a|an)\b/gi, "")

        .replace(/[^\w\s&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const words = cleaned.split(/\s+/).filter((word: string) => {
        const lowerWord = word.toLowerCase();

        const blacklistWords = [
            "and",
            "or",
            "of",
            "in",
            "on",
            "at",
            "to",
            "for",
            "from",
            "with",
            "by",
            "type",
            "style",
            "brand",
            "kind",
            "sort",
            "item",
            "product",
            "goods",
            "foods",
            "food",
            "grocery",
            "gourmet",
            "premium",
            "quality",
            "grade",
            "fresh",
            "natural",
            "organic",
            "local",
            "imported",
            "authentic",
            "traditional",
            "homemade",
            "handmade",
            "artisan",
            "signature",
            "classic",
            "original",
            "best",
            "top",
            "choice",
            "select",
            "prime",
            "deluxe",
            "luxury",
            "frozen",
            "canned",
            "dried",
            "pack",
            "package",
            "size",
            "large",
            "medium",
            "small",
            "mini",
            "jumbo",
            "family",
            "bulk",
            "value",
            "economy",
        ];

        return (
            word.length > 1 &&
            !/^\d+$/.test(word) &&
            !blacklistWords.includes(lowerWord)
        );
    });

    cleaned = words.join(" ");

    cleaned = cleaned
        .replace(/\bnutella\b/gi, "Nutella")
        .replace(/\bhazelnut\b/gi, "Hazelnut")
        .replace(/\bchocolate\b/gi, "Chocolate")
        .replace(/\bspread\b/gi, "Spread");

    const result = cleaned
        .split(" ")
        .filter((word: string) => word.length > 0)
        .map((word: string) => {
            if (/^[A-Z]/.test(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");

    return result;
}

// background.ts (service worker)
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req?.action === "analyzeScreenshot") {
        (async () => {
            try {
                const { base64Data, pageUrl } = req;
                if (!base64Data || !pageUrl) throw new Error("Missing inputs");

                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
                if (!apiBaseUrl)
                    throw new Error("VITE_API_BASE_URL not configured");

                // Call backend
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
                // Filter and clean
                const products = [];
                for (const p of products_found) {
                    if (p?.confidence > 0.7 && p?.name) {
                        const cleanedName = cleanProductName(p.name); // your cleaner in SW
                        products.push({
                            name: p.name,
                            cleanedName,
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
        return true; // async
    }
});

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

                // Fetch and format using shared API utils
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
        return true; // async
    }

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

        return true; // Keep message channel open for async response
    }

    if (message.action === "cleanProductName") {
        try {
            const cleaned = cleanProductName(message.raw);
            sendResponse({ ok: true, cleaned });
        } catch (error) {
            console.error(
                "[EcoLens Background] Error cleaning product name:",
                error
            );
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
        return true;
    }
});
