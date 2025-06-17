import Fuse from "fuse.js";
import categoriesData from "../data/categories.json";
import foodData from "../data/FoodData_Central_foundation_food_json_2025-04-24.json";

const foodTerms = categoriesData.tags.map((tag) => tag.name.toLowerCase());
console.log(
    "[EcoLens] Loaded",
    foodTerms.length,
    "food terms. First 10:",
    foodTerms.slice(0, 10)
);

const categoriesFuse = new Fuse(foodTerms, {
    threshold: 0.1,
    includeScore: true,
    minMatchCharLength: 3,
    distance: 30,
});

const foodDescriptions = (foodData as any).FoundationFoods.map((food: any) => ({
    description: food.description.toLowerCase(),
    originalDescription: food.description,
}));
console.log(
    "[EcoLens] Loaded",
    foodDescriptions.length,
    "food descriptions. First 5:",
    foodDescriptions.slice(0, 5).map((f: any) => f.originalDescription)
);

const foodDescriptionsFuse = new Fuse(foodDescriptions, {
    keys: ["description"],
    threshold: 0.2,
    includeScore: true,
    minMatchCharLength: 3,
    distance: 30,
});

/**
 * Search for food matches in actual food descriptions
 * @param query - The search query
 * @returns Array of matching food descriptions with scores
 */
export function searchFoodDescriptions(
    query: string
): Array<{ description: string; score: number }> {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const cleaned = query.toLowerCase().trim();
    const results = foodDescriptionsFuse.search(cleaned);

    return results.map((result: any) => ({
        description: result.item.originalDescription,
        score: result.score || 0,
    }));
}

/**
 * Check if a title contains food-related terms by searching actual food descriptions
 * @param title - The page title to check
 * @returns boolean indicating if the title matches food descriptions
 */
export function isFoodPage(title: string): boolean {
    if (!title || title.trim().length === 0) {
        return false;
    }

    const cleaned = title.toLowerCase().trim();
    console.log("[EcoLens] Checking if food page for title:", cleaned);

    const tokens = cleaned
        .split(/[\s\-|,()[\]{}]+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !/^\d+[a-z]*$/.test(token))
        .filter(
            (token) =>
                ![
                    "www",
                    "com",
                    "net",
                    "org",
                    "singapore",
                    "fairprice",
                ].includes(token)
        );

    console.log("[EcoLens] Tokenized title into:", tokens);

    for (const token of tokens) {
        const foodResults = foodDescriptionsFuse.search(token);
        console.log(
            `[EcoLens] Food description search results for "${token}":`,
            foodResults
        );

        if (foodResults.length > 0) {
            console.log(
                `[EcoLens] Food descriptions found for token "${token}":`,
                foodResults
                    .slice(0, 3)
                    .map((r: any) => r.item.originalDescription)
            );
            return true;
        }
    }

    console.log("[EcoLens] No food descriptions found for any tokens");
    return false;
}

/**
 * Get the best matching food categories for a given title
 * @param title - The page title to analyze
 * @returns Array of matching food category names with scores
 */
export function getFoodMatches(
    title: string
): Array<{ term: string; score: number }> {
    if (!title || title.trim().length === 0) {
        return [];
    }

    const cleaned = title.toLowerCase().trim();
    const results = categoriesFuse.search(cleaned);

    return results.map((result) => ({
        term: result.item,
        score: result.score || 0,
    }));
}
