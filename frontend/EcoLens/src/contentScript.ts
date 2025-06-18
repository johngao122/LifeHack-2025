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
 * ### Product Detection Strategies:
 * The system uses a hierarchical approach with fallback mechanisms:
 *
 * #### 1. JSON-LD Structured Data Extraction
 * - Parses schema.org Product markup
 * - Handles nested objects and arrays
 * - Highest confidence source (0.9-0.95)
 *
 * #### 2. Meta Tag Analysis
 * - Extracts OpenGraph and Twitter card data
 * - Fallback for structured data (0.7-0.8 confidence)
 *
 * #### 3. DOM Selector Matching
 * - Uses curated selectors for product names/titles
 * - Applies visual hierarchy scoring
 * - Multiple validation layers (0.4-0.7 confidence)
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
 * - Graceful degradation when detection fails
 * - Fallback strategies for different site structures
 * - User feedback for manual correction
 * - Comprehensive logging for debugging
 */

"use strict";

import { isFoodPage } from "./utils/fuzzyMatcher.js";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

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

class ProductScraper {
    private productSelectors = [
        '[data-testid*="product-name"]',
        '[data-testid*="product-title"]',
        ".product-name",
        ".product-title",
        ".product-header",
        ".item-name",
        ".item-title",
        'h1[class*="product"]',
        'h1[class*="title"]',
        'h1[id*="product"]',
        'h1[id*="title"]',
        '[class*="product-name"]',
        '[class*="product-title"]',
        '[id*="product-name"]',
        '[id*="product-title"]',

        "#productTitle",
        ".product-name",
        ".pdp-product-name",
        ".product-title",
        ".item-title",
        "h1.a-size-large",
        '[data-automation-id="product-title"]',
        ".product-details-product-title",
        ".js-product-name",

        ".food-name",
        ".recipe-title",
        ".dish-name",
        '[class*="food-title"]',
        '[class*="recipe-name"]',
        '[data-testid*="food"]',
        '[data-testid*="recipe"]',

        ".grocery-product-name",
        ".food-product-title",
        '[class*="grocery"]',
        '[class*="nutrition"]',

        '[data-testid*="product"]',
        '[class*="ProductName"]',
        '[class*="product-info"]',
        'h1[class*="name"]',
        'h2[class*="name"]',
        ".sc-product-name",

        "main h1",
        "article h1",
        '[role="main"] h1',
    ];

    private fallbackSelectors = [
        "h1:first-of-type",
        "h2:first-of-type",
        ".main-content h1",
        ".content h1",
        "#main h1",
    ];

    scrapeProducts(): ProductInfo[] {
        try {
            const jsonLdProducts = this.extractFromJsonLd();
            if (jsonLdProducts.length > 0) {
                return jsonLdProducts;
            }
        } catch (error) {
            console.warn("[EcoLens] JSON-LD extraction failed:", error);
        }

        const metaProducts = this.extractFromMetaTags();
        if (metaProducts.length > 0) {
            return metaProducts;
        }

        return this.extractFromDomSelectors();
    }

    private extractFromJsonLd(): ProductInfo[] {
        const products: ProductInfo[] = [];

        const jsonLdScripts = document.querySelectorAll(
            'script[type="application/ld+json"]'
        );

        jsonLdScripts.forEach((script, index) => {
            try {
                const scriptContent = script.textContent || "";
                if (!scriptContent.trim()) {
                    console.warn(`[EcoLens] Empty JSON-LD script[${index}]`);
                    return;
                }

                let cleanedContent = scriptContent.trim();

                cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, "$1");

                const jsonStart = cleanedContent.indexOf("{");
                const jsonEnd = cleanedContent.lastIndexOf("}");

                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    cleanedContent = cleanedContent.substring(
                        jsonStart,
                        jsonEnd + 1
                    );
                }

                const jsonData = JSON.parse(cleanedContent);
                const productData = this.findProductInJsonLd(jsonData);

                if (productData && productData.name) {
                    const rawName = productData.name;
                    if (this.isValidProductName(rawName)) {
                        products.push({
                            name: rawName,
                            cleanedName: cleanProductName(rawName),
                            confidence: 0.9,
                            source: `json-ld[${index}]`,
                        });
                    }
                }
            } catch (error) {
                console.warn(
                    `[EcoLens] Failed to parse JSON-LD[${index}]:`,
                    error
                );
            }
        });

        return this.deduplicateProducts(products);
    }

    private findProductInJsonLd(data: any): any {
        if (Array.isArray(data)) {
            for (const item of data) {
                const product = this.findProductInJsonLd(item);
                if (product) return product;
            }
        } else if (data && typeof data === "object") {
            const type = data["@type"] || data.type;
            if (
                type &&
                (type.includes("Product") ||
                    type.includes("FoodProduct") ||
                    type.includes("GroceryProduct") ||
                    type === "Product" ||
                    type === "FoodProduct")
            ) {
                return data;
            }

            if (data["@graph"]) {
                return this.findProductInJsonLd(data["@graph"]);
            }

            for (const value of Object.values(data)) {
                if (typeof value === "object") {
                    const product = this.findProductInJsonLd(value);
                    if (product) return product;
                }
            }
        }

        return null;
    }

    private extractFromMetaTags(): ProductInfo[] {
        const products: ProductInfo[] = [];

        const ogTitle = document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute("content");
        const ogProductName = document
            .querySelector('meta[property="og:product:name"]')
            ?.getAttribute("content");

        const twitterTitle = document
            .querySelector('meta[name="twitter:title"]')
            ?.getAttribute("content");

        const metaTitle = document.querySelector("title")?.textContent;

        const metaCandidates = [
            {
                name: ogProductName,
                source: "og:product:name",
                confidence: 0.85,
            },
            { name: ogTitle, source: "og:title", confidence: 0.8 },
            {
                name: twitterTitle,
                source: "twitter:title",
                confidence: 0.75,
            },
            { name: metaTitle, source: "title", confidence: 0.7 },
        ];

        for (const candidate of metaCandidates) {
            if (candidate.name && this.isValidProductName(candidate.name)) {
                products.push({
                    name: candidate.name,
                    cleanedName: cleanProductName(candidate.name),
                    confidence: candidate.confidence,
                    source: candidate.source,
                });

                if (candidate.confidence >= 0.8) {
                    break;
                }
            }
        }

        return this.deduplicateProducts(products);
    }

    private extractFromDomSelectors(): ProductInfo[] {
        const products: ProductInfo[] = [];

        const highPrioritySelectors = [
            "h1",
            '[data-testid*="product-title"]',
            '[data-testid*="product-name"]',
            ".product-title",
            ".product-name",
            "#productTitle",
        ];

        for (const selector of highPrioritySelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const rawName = this.extractTextContent(element);
                if (
                    rawName &&
                    this.isValidProductName(rawName) &&
                    this.isLikelyProductTitle(rawName) &&
                    this.hasGoodVisualHierarchy(element)
                ) {
                    products.push({
                        name: rawName,
                        cleanedName: cleanProductName(rawName),
                        confidence: 0.7,
                        source: `dom-high:${selector}[${index}]`,
                    });
                }
            });
        }

        if (products.length > 0) {
            return this.deduplicateProducts(products);
        }

        for (const selector of this.productSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const rawName = this.extractTextContent(element);
                if (rawName && this.isValidProductName(rawName)) {
                    products.push({
                        name: rawName,
                        cleanedName: cleanProductName(rawName),
                        confidence: 0.6,
                        source: `dom-med:${selector}[${index}]`,
                    });
                }
            });
        }

        if (products.length === 0) {
            for (const selector of this.fallbackSelectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element, index) => {
                    const rawName = this.extractTextContent(element);
                    if (rawName && this.isValidProductName(rawName)) {
                        products.push({
                            name: rawName,
                            cleanedName: cleanProductName(rawName),
                            confidence: 0.5,
                            source: `dom-fallback:${selector}[${index}]`,
                        });
                    }
                });
            }
        }

        return this.deduplicateProducts(products);
    }

    private extractTextContent(element: Element): string {
        return element.textContent?.trim() || "";
    }

    private isValidProductName(text: string): boolean {
        if (!text || text.length < 3) return false;

        const blacklist = [
            "home",
            "about",
            "contact",
            "login",
            "register",
            "cart",
            "checkout",
            "search",
            "menu",
            "navigation",
            "footer",
            "header",
            "sidebar",
            "advertisement",
            "sponsored",
            "cookie",
            "privacy",
            "terms",
            "loading",
            "error",
            "page not found",
            "404",
            "coming soon",

            "recommended for you",
            "customers who bought",
            "frequently bought together",
            "similar products",
            "related products",
            "you might also like",
            "others also viewed",
            "from the same shop",
            "compare with similar",
            "also bought",
            "customers also",
            "people also",
            "suggested",
            "recommendation",
            "see more",
            "view all",
            "shop now",
            "buy now",
            "add to cart",
            "provide feedback",
            "repository",
        ];

        const lowerText = text.toLowerCase();

        if (blacklist.some((word) => lowerText.includes(word))) {
            return false;
        }

        const isOnFoodPage = this.isFoodPage();

        const basicValidation =
            text.length >= 3 &&
            text.length <= 200 &&
            !/^\s*$/.test(text) &&
            !/^\d+$/.test(text);

        if (isOnFoodPage) {
            return basicValidation;
        } else {
            const foodIndicators = [
                "recipe",
                "ingredient",
                "serving",
                "calories",
                "nutrition",
                "organic",
                "fresh",
                "frozen",
                "canned",
                "dried",
                "natural",
                "gluten",
                "dairy",
                "vegan",
                "vegetarian",
                "protein",
                "fiber",
                "vitamin",
                "mineral",
                "chocolate",
                "spread",
                "sauce",
                "snack",
                "drink",
                "milk",
                "cheese",
            ];

            const hasFoodIndicator = foodIndicators.some((indicator) =>
                lowerText.includes(indicator)
            );

            return basicValidation && hasFoodIndicator;
        }
    }

    private isLikelyProductTitle(text: string): boolean {
        if (/^[A-Z\s;\/]+$/.test(text)) {
            return false;
        }

        const badPatterns = [
            /^(country|place|dietary|allergen|ingredient|nutrition)/i,
            /^(add to cart|buy now|price|rating|review)/i,
            /^(home|about|contact|search|menu|navigation)/i,
            /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /^\d+[\s]*%/,
            /turkey;dietary|halal/i,
            /origin.*turkey.*dietary.*halal/i,
            /^(turkey|singapore|malaysia|thailand|china|usa|imported)$/i,
            /^(halal|kosher|organic|natural|gluten.free)$/i,
            /^(brand|manufacturer|country|place|origin|dietary)$/i,
        ];

        if (badPatterns.some((pattern) => pattern.test(text))) {
            return false;
        }

        const looksLikeProductName =
            /^[A-Z][a-z]/.test(text) ||
            /\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text) ||
            /\b(spread|sauce|chocolate|milk|cheese|bread|snack|drink|nutella|hazelnut)\b/i.test(
                text
            );

        const words = text.split(/\s+/);
        if (words.length === 1 && text.length < 10) {
            const isSingleAttribute =
                /^(turkey|halal|kosher|organic|natural|fresh|frozen|local|imported)$/i.test(
                    text
                );
            if (isSingleAttribute) {
                return false;
            }
        }

        if (!looksLikeProductName) {
            return false;
        }

        const goodPatterns = [
            /\b(spread|sauce|chocolate|milk|cheese|bread|snack|drink|nutella|hazelnut)\b/i,
            /\b[a-z]+[A-Z][a-z]+\b/,
            /^[A-Z][a-z]/,
        ];

        const hasGoodPattern = goodPatterns.some((pattern) =>
            pattern.test(text)
        );

        const goodLength = text.length >= 5 && text.length <= 100;

        const wordCount = text.split(/\s+/).length;
        const goodWordCount = wordCount >= 2 && wordCount <= 8;

        const hasSuspiciousChars =
            /[;:|]{2,}/.test(text) ||
            text.includes("DIETARY") ||
            text.includes("ORIGIN");

        const isLikely =
            hasGoodPattern &&
            goodLength &&
            goodWordCount &&
            !hasSuspiciousChars;

        return isLikely;
    }

    private hasGoodVisualHierarchy(element: Element): boolean {
        const badSelectors = [
            "table",
            ".product-specs",
            ".nutrition-facts",
            ".specifications",
            '[data-testid*="productContextAttribute"]',
            '[data-testid*="productAttribute"]',
            '[data-testid*="specification"]',
            '[data-testid*="nutritionFacts"]',
            ".product-attributes",
            ".product-specifications",

            '[class*="recommendation"]',
            '[class*="recommended"]',
            '[class*="suggest"]',
            '[class*="related"]',
            '[class*="similar"]',
            '[class*="carousel"]',
            '[class*="slider"]',
            '[data-testid*="recommendation"]',
            '[data-testid*="suggested"]',
            '[data-testid*="related"]',
            '[data-testid*="similar"]',
            '[id*="recommendation"]',
            '[id*="suggested"]',
            '[id*="related"]',
            '[id*="similar"]',

            ".recommendation-by-carousel",
            ".shopee-header-section",
            ".image-carousel",

            "#similarities_feature_div",
            "#sims_feature_div",
            '[data-feature-name*="similarities"]',
            '[data-feature-name*="compare"]',
            '[data-cel-widget*="similarity"]',

            '[class*="also-bought"]',
            '[class*="customers-also"]',
            '[class*="frequently-bought"]',
            '[class*="bundle"]',
            '[class*="cross-sell"]',
            '[class*="up-sell"]',
        ];

        const closestBadElement = badSelectors.find((selector) =>
            element.closest(selector)
        );
        if (closestBadElement) {
            return false;
        }

        const parentElement = element.closest("div, section, article");
        if (parentElement) {
            const parentText = parentElement.textContent?.toLowerCase() || "";
            const recommendationKeywords = [
                "from the same shop",
                "recommended for you",
                "customers who bought",
                "frequently bought together",
                "similar products",
                "related products",
                "you might also like",
                "others also viewed",
                "compare with similar",
                "sponsored",
                "advertisement",
            ];

            if (
                recommendationKeywords.some((keyword) =>
                    parentText.includes(keyword)
                )
            ) {
                return false;
            }
        }

        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize) || 16;
        const display = computedStyle.display;
        const visibility = computedStyle.visibility;
        const opacity = parseFloat(computedStyle.opacity) || 1;

        if (display === "none" || visibility === "hidden" || opacity < 0.1) {
            return false;
        }

        const isLargeFont = fontSize >= 18;

        const rect = element.getBoundingClientRect();
        const isNearTop = rect.top < window.innerHeight * 0.6;

        const isProminentTag = ["H1", "H2"].includes(element.tagName);

        const hasGoodHierarchy = (isLargeFont || isProminentTag) && isNearTop;

        return hasGoodHierarchy;
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

                    const rawProductData = await productResponse.json();

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

    private deduplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Map<string, ProductInfo>();

        products.forEach((product) => {
            const key = product.cleanedName.toLowerCase();
            if (
                !seen.has(key) ||
                seen.get(key)!.confidence < product.confidence
            ) {
                seen.set(key, product);
            }
        });

        return Array.from(seen.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);
    }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "scrapeProducts") {
        try {
            const scraper = new ProductScraper();
            const products = scraper.scrapeProducts();
            sendResponse({ products });
        } catch (error) {
            console.error("[EcoLens] Error in message handler:", error);
            sendResponse({ products: [], error: String(error) });
        }
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

const checkForProducts = (currentUrl: string, isRetry = false) => {
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
        const products = scraper.scrapeProducts();

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
export { ProductScraper, cleanProductName };
