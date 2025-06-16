(function () {
    "use strict";

    interface ProductInfo {
        name: string;
        cleanedName: string;
        confidence: number;
        source: string;
    }

    function cleanProductName(rawName: string): string {
        if (!rawName) return "";

        console.log(`[EcoLens] Cleaning product name: "${rawName}"`);

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
                return (
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                );
            })
            .join(" ");

        console.log(`[EcoLens] Cleaned result: "${result}"`);
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
                    console.log(
                        "[EcoLens] Found JSON-LD products:",
                        jsonLdProducts
                    );
                    return jsonLdProducts;
                }
            } catch (error) {
                console.warn("[EcoLens] JSON-LD extraction failed:", error);
            }

            const metaProducts = this.extractFromMetaTags();
            if (metaProducts.length > 0) {
                console.log("[EcoLens] Found meta tag products:", metaProducts);
                return metaProducts;
            }

            console.log(
                "[EcoLens] No structured data found, using DOM selectors"
            );
            return this.extractFromDomSelectors();
        }

        private extractFromJsonLd(): ProductInfo[] {
            const products: ProductInfo[] = [];

            const jsonLdScripts = document.querySelectorAll(
                'script[type="application/ld+json"]'
            );

            console.log(
                `[EcoLens] Found ${jsonLdScripts.length} JSON-LD script tags`
            );

            jsonLdScripts.forEach((script, index) => {
                try {
                    const scriptContent = script.textContent || "";
                    if (!scriptContent.trim()) {
                        console.warn(
                            `[EcoLens] Empty JSON-LD script[${index}]`
                        );
                        return;
                    }

                    let cleanedContent = scriptContent.trim();

                    cleanedContent = cleanedContent.replace(
                        /,(\s*[}\]])/g,
                        "$1"
                    );

                    const jsonStart = cleanedContent.indexOf("{");
                    const jsonEnd = cleanedContent.lastIndexOf("}");

                    if (
                        jsonStart !== -1 &&
                        jsonEnd !== -1 &&
                        jsonEnd > jsonStart
                    ) {
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
                console.log(
                    "[EcoLens] Found DOM high-priority products:",
                    products
                );
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
            ];

            const lowerText = text.toLowerCase();

            if (blacklist.some((word) => lowerText.includes(word))) {
                console.log(`[EcoLens] Rejected blacklisted text: "${text}"`);
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
                console.log(`[EcoLens] Rejected all-caps text: "${text}"`);
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
                console.log(
                    `[EcoLens] Rejected as unlikely product title: "${text}"`
                );
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
                    console.log(
                        `[EcoLens] Rejected single attribute word: "${text}"`
                    );
                    return false;
                }
            }

            if (!looksLikeProductName) {
                console.log(
                    `[EcoLens] Text doesn't look like product name: "${text}"`
                );
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
            console.log(
                `[EcoLens] Title likelihood for "${text}": ${isLikely} (goodPattern: ${hasGoodPattern}, goodLength: ${goodLength}, goodWordCount: ${goodWordCount}, suspicious: ${hasSuspiciousChars})`
            );

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
                console.log(
                    `[EcoLens] Rejected element in spec/recommendation section (${closestBadElement}): "${element.textContent?.trim()}"`
                );
                return false;
            }

            const parentElement = element.closest("div, section, article");
            if (parentElement) {
                const parentText =
                    parentElement.textContent?.toLowerCase() || "";
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
                    console.log(
                        `[EcoLens] Rejected element in recommendation section by text: "${element.textContent?.trim()}"`
                    );
                    return false;
                }
            }

            const computedStyle = window.getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize) || 16;
            const display = computedStyle.display;
            const visibility = computedStyle.visibility;
            const opacity = parseFloat(computedStyle.opacity) || 1;

            if (
                display === "none" ||
                visibility === "hidden" ||
                opacity < 0.1
            ) {
                console.log(
                    `[EcoLens] Rejected hidden element: "${element.textContent?.trim()}"`
                );
                return false;
            }

            const isLargeFont = fontSize >= 18;

            const rect = element.getBoundingClientRect();
            const isNearTop = rect.top < window.innerHeight * 0.6;

            const isProminentTag = ["H1", "H2"].includes(element.tagName);

            const hasGoodHierarchy =
                (isLargeFont || isProminentTag) && isNearTop;

            console.log(
                `[EcoLens] Visual hierarchy check for "${element.textContent?.trim()}": ${hasGoodHierarchy} (fontSize: ${fontSize}, prominent: ${isProminentTag}, nearTop: ${isNearTop})`
            );

            return hasGoodHierarchy;
        }

        public isFoodPage(): boolean {
            const title = document.title.toLowerCase();
            const bodyText = document.body.textContent?.toLowerCase() || "";
            const url = window.location.href.toLowerCase();

            const metaDescription =
                document
                    .querySelector('meta[name="description"]')
                    ?.getAttribute("content")
                    ?.toLowerCase() || "";
            const metaKeywords =
                document
                    .querySelector('meta[name="keywords"]')
                    ?.getAttribute("content")
                    ?.toLowerCase() || "";
            const ogTitle =
                document
                    .querySelector('meta[property="og:title"]')
                    ?.getAttribute("content")
                    ?.toLowerCase() || "";
            const ogDescription =
                document
                    .querySelector('meta[property="og:description"]')
                    ?.getAttribute("content")
                    ?.toLowerCase() || "";

            const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
                .map((el) => el.textContent?.toLowerCase() || "")
                .join(" ");

            const allText = [
                title,
                bodyText,
                metaDescription,
                metaKeywords,
                ogTitle,
                ogDescription,
                headings,
                url,
            ].join(" ");

            const foodKeywords = [
                "food",
                "ingredient",
                "recipe",
                "cooking",
                "kitchen",
                "meal",
                "dish",

                "nutrition",
                "calories",
                "protein",
                "carbs",
                "fat",
                "fiber",
                "vitamin",
                "organic",
                "natural",
                "gluten",
                "dairy",
                "vegan",
                "vegetarian",
                "halal",
                "sugar",
                "sodium",
                "cholesterol",
                "serving",
                "portion",

                "fruit",
                "vegetable",
                "meat",
                "seafood",
                "grain",
                "cereal",
                "bread",
                "pasta",
                "rice",
                "snack",
                "beverage",
                "drink",
                "juice",
                "milk",
                "cheese",
                "yogurt",
                "chocolate",
                "candy",
                "dessert",
                "ice cream",
                "sauce",
                "condiment",
                "spice",
                "herb",
                "oil",
                "vinegar",

                "fresh",
                "frozen",
                "canned",
                "dried",
                "processed",
                "cooked",
                "raw",
                "baked",
                "fried",
                "grilled",
                "roasted",
                "steamed",

                "grocery",
                "supermarket",
                "add to cart",
                "buy now",
                "price",
                "brand",
                "manufacturer",
                "expiry",
                "best before",
                "shelf life",

                "country of origin",
                "place of origin",
                "imported",
                "local",
                "premium",
                "gourmet",
                "artisan",
                "homemade",

                "pack",
                "bottle",
                "can",
                "jar",
                "box",
                "bag",
                "pouch",
                "kg",
                "gram",
                "liter",
                "ml",
                "oz",
                "lb",
                "serving size",
            ];

            let foodScore = 0;
            const minScore = 2;

            for (const keyword of foodKeywords) {
                if (allText.includes(keyword)) {
                    foodScore++;
                    if (foodScore >= minScore) break;
                }
            }

            if (
                title.includes("nutrition") ||
                bodyText.includes("nutrition facts")
            )
                foodScore += 2;
            if (
                bodyText.includes("add to cart") ||
                bodyText.includes("buy now")
            )
                foodScore++;
            if (allText.includes("dietary") || allText.includes("allergen"))
                foodScore++;
            if (
                url.includes("food") ||
                url.includes("grocery") ||
                url.includes("market")
            )
                foodScore++;

            const hasProductIndicators =
                bodyText.includes("add to cart") ||
                bodyText.includes("buy now") ||
                bodyText.includes("price") ||
                bodyText.includes("brand");

            if (hasProductIndicators && foodScore >= 1) {
                foodScore += 1;
            }

            return foodScore >= minScore;
        }

        public showProductDetectionNotification(product: ProductInfo): void {
            try {
                console.log(
                    "[EcoLens] Showing notification for:",
                    product.cleanedName
                );

                console.log(
                    `🌱 EcoLens Detected Food Product: ${product.cleanedName}`
                );

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
                                notification.parentNode.removeChild(
                                    notification
                                );
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
                console.log(
                    "[EcoLens] Showing product popup for:",
                    products.length,
                    "products"
                );

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
                            ">Click to learn more about sustainability</p>
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
                        popupEl.style.transform =
                            "translateX(-50%) scale(1.05)";
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
                        const popupEl =
                            document.getElementById("ecolens-popup");
                        if (popupEl) {
                            popupEl.style.opacity = "0";
                            popupEl.style.transform =
                                "translateX(-50%) scale(0.8)";
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

                popupEl?.addEventListener("mouseenter", () =>
                    setInteracting(true)
                );
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
                console.log(
                    "[EcoLens] Showing product validation for:",
                    products.length,
                    "products"
                );

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
                console.error(
                    "[EcoLens] Error showing product validation:",
                    error
                );
            }
        }

        private proceedWithGreenScore(product: ProductInfo): void {
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

                setTimeout(() => {
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
                        ">
                            🌱 Analyzing "${product.cleanedName}" green score...
                        </div>
                    `;
                    document.body.appendChild(successPopup);
                    setTimeout(() => successPopup.remove(), 3000);
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

                input?.addEventListener("focus", () => {
                    input.style.borderColor = "#059669";
                    setInteracting?.(true);
                });
                input?.addEventListener("blur", () => {
                    input.style.borderColor = "#d1d5db";
                    setInteracting?.(false);
                });
                input?.addEventListener("input", () => {
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
        console.log("[EcoLens] Received message:", request);

        if (request.action === "scrapeProducts") {
            try {
                const scraper = new ProductScraper();
                const products = scraper.scrapeProducts();
                console.log(
                    "[EcoLens] Sending response with products:",
                    products
                );
                sendResponse({ products });
            } catch (error) {
                console.error("[EcoLens] Error in message handler:", error);
                sendResponse({ products: [], error: String(error) });
            }
        }

        return true;
    });

    let lastUrl = location.href;
    let retryCount = 0;
    const maxRetries = 5;
    let popupShownForUrl = new Set<string>();
    let isProcessing = false;

    const checkForProducts = (currentUrl: string, isRetry = false) => {
        if (isProcessing) {
            console.log("[EcoLens] Already processing, skipping");
            return;
        }

        if (location.href !== currentUrl) {
            console.log("[EcoLens] URL changed during check, aborting");
            return;
        }

        if (popupShownForUrl.has(currentUrl)) {
            console.log("[EcoLens] Popup already shown for this URL, skipping");
            return;
        }

        popupShownForUrl.add(currentUrl);
        isProcessing = true;

        const scraper = new ProductScraper();
        if (scraper.isFoodPage()) {
            const products = scraper.scrapeProducts();
            console.log(
                `[EcoLens] Found ${products.length} products on ${currentUrl}`
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

                    try {
                        scraper.showProductDetectedPopup(products);
                    } catch (e) {
                        console.warn(
                            "[EcoLens] Could not show product popup:",
                            e
                        );
                    }
                }
            } else if (isRetry && retryCount < maxRetries) {
                retryCount++;
                console.log(
                    `[EcoLens] Retry ${retryCount}/${maxRetries} for ${currentUrl}`
                );

                popupShownForUrl.delete(currentUrl);
                setTimeout(() => {
                    isProcessing = false;
                    checkForProducts(currentUrl, true);
                }, 2000);
                return;
            } else if (!isRetry && products.length === 0) {
                const isShopee = window.location.hostname.includes("shopee");
                if (isShopee) {
                    console.log(
                        "[EcoLens] Shopee detected, starting retry sequence"
                    );
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
            console.log("[EcoLens] URL changed to:", url);

            popupShownForUrl.clear();

            const existingPopup = document.getElementById(
                "ecolens-product-popup"
            );
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
            console.log("[EcoLens] Already initialized, skipping...");
            return;
        }
        (window as any).ecoLensInitialized = true;

        try {
            console.log("[EcoLens] Initializing on:", window.location.href);

            const scraper = new ProductScraper();

            const isFoodPage = scraper.isFoodPage();
            console.log("[EcoLens] Is food page:", isFoodPage);

            if (isFoodPage) {
                checkForProducts(window.location.href, false);
            }
        } catch (error) {
            console.error("[EcoLens] Error during initialization:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeEcoLens);
    } else {
        setTimeout(initializeEcoLens, 100);
    }

    setTimeout(initializeEcoLens, 3000);
})();
