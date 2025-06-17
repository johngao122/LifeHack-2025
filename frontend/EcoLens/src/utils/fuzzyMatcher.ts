/**
 * # Fuzzy Matching and Food Detection System
 *
 * This module implements intelligent food detection and matching using fuzzy search algorithms.
 * It determines whether web pages contain food products and provides semantic matching
 * capabilities for product identification.
 *
 * ## Data Sources:
 * - `categories.json`: Curated food category terms for broad matching
 * - `FoodData_Central_foundation_food_json_2025-04-24.json`: USDA food database for precise matching
 *
 * ## Architecture:
 * Uses Fuse.js for fuzzy string matching with two complementary strategies:
 * 1. **Category Matching**: Fast matching against food category terms
 * 2. **Description Matching**: Deep matching against actual food descriptions
 *
 * ## Core Functions:
 *
 * ### isFoodPage()
 * Determines if a webpage contains food products by:
 * - Tokenizing page titles into meaningful terms
 * - Filtering out non-food tokens (URLs, numbers, common words)
 * - Matching tokens against USDA food descriptions
 * - Using fuzzy matching for typo tolerance
 *
 * ### searchFoodDescriptions()
 * Searches actual food descriptions for semantic matches.
 * Returns scored results for ranking product relevance.
 *
 * ### getFoodMatches()
 * Provides category-level food matching for broader classification.
 *
 * ## Performance Considerations:
 * - Pre-loads and indexes food data on module initialization
 * - Uses efficient tokenization to reduce search space
 * - Configurable thresholds balance accuracy vs speed
 */

import Fuse from "fuse.js";
import categoriesData from "../data/categories.json";
import foodData from "../data/FoodData_Central_foundation_food_json_2025-04-24.json";

const foodTerms = categoriesData.tags.map((tag) => tag.name.toLowerCase());

const categoriesFuse = new Fuse(foodTerms, {
    threshold: 0.1,
    includeScore: true,
    minMatchCharLength: 3,
    ignoreLocation: true,
});

const foodDescriptions = (foodData as any).FoundationFoods.map((food: any) => ({
    description: food.description.toLowerCase(),
    originalDescription: food.description,
}));

const foodDescriptionsFuse = new Fuse(foodDescriptions, {
    keys: ["description"],
    threshold: 0.2,
    includeScore: true,
    minMatchCharLength: 3,
    ignoreLocation: true,
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

    for (const token of tokens) {
        const foodResults = foodDescriptionsFuse.search(token);

        if (foodResults.length > 0) {
            return true;
        }
    }

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
