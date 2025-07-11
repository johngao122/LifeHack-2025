/**
 * # Product Name Cleaning and Categorization Utilities
 *
 * This module provides intelligent product name cleaning and categorization for improved
 * sustainability analysis accuracy. It removes marketing terms, quantities, and brand
 * modifiers while preserving essential product information.
 *
 * ## Core Functions:
 *
 * ### extractBrandFromName()
 * Extracts brand names from product titles using capitalization patterns and word analysis.
 * Uses fallback strategies for robust brand detection across different naming conventions.
 *
 * ### categorizeProduct()
 * Categorizes products into major categories (Electronics, Clothing, Food, etc.) using
 * keyword matching. Essential for determining appropriate sustainability metrics.
 *
 * ### cleanSearchTerm()
 * The primary cleaning function that:
 * - Removes retailer names and generic marketing terms
 * - Strips quantities, sizes, and measurements
 * - Filters out promotional language
 * - Normalizes product names for API consumption
 *
 * ## Design Principles:
 * - Conservative cleaning: preserve product essence while removing noise
 * - Multiple cleaning passes: brand → generic terms → quantities → normalization
 * - Fallback handling: graceful degradation when cleaning fails
 * - Case sensitivity: proper capitalization for brand recognition
 */

export function extractBrandFromName(productName: string): string {
    try {
        const words = productName.split(" ");
        const firstWord = words[0];

        if (firstWord && /^[A-Z][a-z]+/.test(firstWord)) {
            return firstWord;
        }

        const capitalizedWords = words.filter((word) =>
            /^[A-Z][a-z]+/.test(word)
        );
        return capitalizedWords[0] || "";
    } catch (error) {
        console.warn("[EcoLens] Brand extraction failed:", error);

        const words = productName.split(" ");
        const firstWord = words[0];
        return firstWord && /^[A-Z]/.test(firstWord) ? firstWord : "";
    }
}

export function categorizeProduct(productName: string): string {
    const text = productName.toLowerCase();

    const categories = {
        Electronics: [
            "phone",
            "laptop",
            "computer",
            "tablet",
            "tv",
            "camera",
            "headphones",
            "speaker",
            "monitor",
            "keyboard",
            "mouse",
        ],
        Clothing: [
            "shirt",
            "pants",
            "dress",
            "shoes",
            "jacket",
            "coat",
            "hat",
            "socks",
            "underwear",
            "jeans",
            "sweater",
        ],
        "Home & Garden": [
            "furniture",
            "chair",
            "table",
            "bed",
            "sofa",
            "lamp",
            "rug",
            "curtain",
            "plant",
            "pot",
            "vase",
        ],
        Beauty: [
            "makeup",
            "perfume",
            "cream",
            "lotion",
            "shampoo",
            "soap",
            "lipstick",
            "foundation",
            "mascara",
        ],
        Sports: [
            "ball",
            "racket",
            "weights",
            "bike",
            "shoes",
            "equipment",
            "gear",
            "fitness",
            "exercise",
        ],
        Books: [
            "book",
            "novel",
            "guide",
            "manual",
            "textbook",
            "magazine",
            "journal",
        ],
        Food: [
            "coffee",
            "tea",
            "snack",
            "food",
            "drink",
            "beverage",
            "supplement",
            "vitamin",
            "chocolate",
            "spread",
            "nutella",
            "hazelnut",
        ],
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some((keyword) => text.includes(keyword))) {
            return category;
        }
    }

    return "Other";
}

export function cleanSearchTerm(searchTerm: string): string {
    if (!searchTerm) return "";

    let cleaned = searchTerm.toLowerCase().trim();

    const brandPrefixes = [
        "amazon",
        "walmart",
        "target",
        "shopee",
        "lazada",
        "fair price",
        "ntuc",
        "cold storage",
        "giant",
        "carrefour",
        "tesco",
        "sainsbury",
        "asda",
        "kroger",
        "safeway",
    ];

    const brandSuffixes = [
        "store",
        "market",
        "shop",
        "supermarket",
        "grocery",
        "foods",
        "fresh",
        "organic",
    ];

    for (const prefix of brandPrefixes) {
        const regex = new RegExp(`^${prefix}\\s+`, "i");
        cleaned = cleaned.replace(regex, "");
    }

    for (const suffix of brandSuffixes) {
        const regex = new RegExp(`\\s+${suffix}$`, "i");
        cleaned = cleaned.replace(regex, "");
    }

    const genericTerms = [
        "grocery",
        "food",
        "item",
        "product",
        "buy",
        "online",
        "delivery",
        "fresh",
        "organic",
        "natural",
        "premium",
        "gourmet",
        "artisan",
        "homemade",
        "local",
        "imported",
        "best",
        "top",
        "quality",
        "grade",
        "choice",
        "select",
        "prime",
        "family",
        "pack",
        "size",
        "large",
        "medium",
        "small",
        "mini",
        "jumbo",
        "sale",
        "offer",
        "deal",
        "discount",
        "special",
        "promotion",
    ];

    const words = cleaned.split(/\s+/).filter((word: string) => {
        word = word.trim();
        return (
            word.length > 1 &&
            !/^\d+$/.test(word) &&
            !genericTerms.includes(word.toLowerCase()) &&
            !/^(g|kg|ml|l|oz|lb|lbs|pcs|pc|pack|ct|count|set)$/i.test(word)
        );
    });

    const commonBrands = [
        "nestle",
        "unilever",
        "procter",
        "gamble",
        "johnson",
        "colgate",
        "palmolive",
        "reckitt",
        "benckiser",
        "henkel",
        "loreal",
        "nivea",
        "dove",
        "axe",
    ];

    const filteredWords = words.filter((word) => {
        const lowerWord = word.toLowerCase();
        return !commonBrands.some((brand) => lowerWord.includes(brand));
    });

    cleaned = filteredWords.join(" ").trim();

    cleaned = cleaned.replace(/\s+/g, " ");

    return cleaned;
}
