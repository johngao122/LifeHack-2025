export function cleanProductName(rawName: string): string {
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
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");

    console.log(`[EcoLens] Cleaned result: "${result}"`);
    return result;
}

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

    console.log(`[EcoLens] Cleaning search term: "${searchTerm}"`);

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

    console.log(`[EcoLens] Cleaned search term result: "${cleaned}"`);
    return cleaned;
}
