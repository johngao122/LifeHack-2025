const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Search categories via API
 */
async function searchCategoriesAPI(
    query: string,
    limit: number = 10
): Promise<Array<{ term: string; score: number }>> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/categories/search?q=${encodeURIComponent(
                query
            )}&limit=${limit}`
        );
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error searching categories:", error);
        return [];
    }
}

/**
 * Search foundation foods via API
 */
async function searchFoundationFoodsAPI(
    query: string,
    limit: number = 10
): Promise<Array<{ description: string; score: number }>> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/foundation_foods/search?q=${encodeURIComponent(
                query
            )}&limit=${limit}`
        );
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.map((item: any) => ({
            description: item.originalDescription || item.description,
            score: item.score,
        }));
    } catch (error) {
        console.error("Error searching foundation foods:", error);
        return [];
    }
}

/**
 * Search for food matches in actual food descriptions
 * @param query - The search query
 * @returns Promise of array of matching food descriptions with scores
 */
export async function searchFoodDescriptions(
    query: string
): Promise<Array<{ description: string; score: number }>> {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const cleaned = query.toLowerCase().trim();
    return await searchFoundationFoodsAPI(cleaned);
}

/**
 * Check if a title contains food-related terms by searching actual food descriptions
 * @param title - The page title to check
 * @returns Promise of boolean indicating if the title matches food descriptions
 */
export async function isFoodPage(title: string): Promise<boolean> {
    if (!title || title.trim().length === 0) {
        return false;
    }

    const cleaned = title.toLowerCase().trim();

    const tokens = cleaned
        .split(/[\s\-|,()[\]{}]+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !/^\d+[a-z]*$/.test(token));

    for (const token of tokens) {
        const foodResults = await searchFoundationFoodsAPI(token, 1);

        if (foodResults.length > 0) {
            return true;
        }
    }

    return false;
}

/**
 * Get the best matching food categories for a given title
 * @param title - The page title to analyze
 * @returns Promise of array of matching food category names with scores
 */
export async function getFoodMatches(
    title: string
): Promise<Array<{ term: string; score: number }>> {
    if (!title || title.trim().length === 0) {
        return [];
    }

    const cleaned = title.toLowerCase().trim();
    return await searchCategoriesAPI(cleaned);
}
