/**
 * # EcoLens API Utilities
 *
 * This module handles all API interactions with the EcoLens backend for product sustainability analysis.
 * It provides formatted data structures, recycling code parsing, and API communication functions.
 *
 * ## Key Features:
 * - Recycling code parsing for plastic, paper, glass, and metal materials
 * - Product sustainability data fetching and formatting
 * - Environmental score calculation and breakdown
 * - Recommendations API integration
 *
 * ## Architecture:
 * The module uses a layered approach:
 * 1. Raw data interfaces (ProductData, MaterialScore)
 * 2. Formatted interfaces (FormattedProductData, FormattedRecommendation)
 * 3. Utility functions (parseRecyclingCode, calculateCarbonBreakdown)
 * 4. API functions (getProductInfo, getRecommendations)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

/**
 * Parses recycling codes and returns material information
 * @param code - The recycling code (e.g., "PP_5", "PAP_21", "GL_70", "CLEAR_GLASS", "PP_5_POLYPROPYLENE")
 * @returns Object with code number and material name
 */
const parseRecyclingCode = (
    code: string
): { codeNumber: number | null; materialName: string } => {
    const upperCode = code.toUpperCase();

    if (upperCode === "CLEAR_GLASS") {
        return { codeNumber: 70, materialName: "Clear Glass" };
    }
    if (upperCode === "GREEN_GLASS") {
        return { codeNumber: 71, materialName: "Green Glass" };
    }
    if (upperCode === "BROWN_GLASS") {
        return { codeNumber: 72, materialName: "Brown Glass" };
    }

    if (upperCode.includes("PP_5") || upperCode.includes("POLYPROPYLENE")) {
        return { codeNumber: 5, materialName: "PP (Polypropylene)" };
    }
    if (upperCode.includes("PET") || upperCode.includes("PETE")) {
        return {
            codeNumber: 1,
            materialName: "PET/PETE (Polyethylene Terephthalate)",
        };
    }
    if (upperCode.includes("HDPE")) {
        return {
            codeNumber: 2,
            materialName: "HDPE (High-Density Polyethylene)",
        };
    }
    if (upperCode.includes("PVC")) {
        return { codeNumber: 3, materialName: "PVC (Polyvinyl Chloride)" };
    }
    if (upperCode.includes("LDPE")) {
        return {
            codeNumber: 4,
            materialName: "LDPE (Low-Density Polyethylene)",
        };
    }
    if (upperCode.includes("PS") || upperCode.includes("POLYSTYRENE")) {
        return { codeNumber: 6, materialName: "PS (Polystyrene)" };
    }

    if (upperCode === "PLASTIC") {
        return { codeNumber: 7, materialName: "Plastic (Mixed)" };
    }

    if (upperCode.includes("CORRUGATED") && upperCode.includes("CARDBOARD")) {
        return { codeNumber: 20, materialName: "Corrugated Cardboard" };
    }
    if (
        upperCode.includes("NON_CORRUGATED") &&
        upperCode.includes("CARDBOARD")
    ) {
        return { codeNumber: 21, materialName: "Non-Corrugated Cardboard" };
    }
    if (upperCode.includes("C_PAP") || upperCode.includes("PAP")) {
        if (upperCode.includes("82")) {
            return { codeNumber: 82, materialName: "Paper/Aluminum Composite" };
        }
        if (upperCode.includes("81")) {
            return { codeNumber: 81, materialName: "Paper/Plastic Composite" };
        }
        if (upperCode.includes("20")) {
            return { codeNumber: 20, materialName: "Corrugated Cardboard" };
        }
        return { codeNumber: 22, materialName: "Paper" };
    }

    if (upperCode.includes("STEEL") || upperCode.includes("FE")) {
        return { codeNumber: 40, materialName: "Steel" };
    }
    if (upperCode.includes("ALUMINUM") || upperCode.includes("ALU")) {
        return { codeNumber: 41, materialName: "Aluminum" };
    }

    const numberMatch = code.match(/(\d+)/);
    const codeNumber = numberMatch ? parseInt(numberMatch[1]) : null;

    if (codeNumber) {
        if (codeNumber >= 1 && codeNumber <= 7) {
            return {
                codeNumber,
                materialName: PLASTIC_CODES[codeNumber] || "Unknown Plastic",
            };
        }
        if (codeNumber >= 20 && codeNumber <= 85) {
            return {
                codeNumber,
                materialName:
                    PAPER_CODES[codeNumber] || "Unknown Paper Product",
            };
        }
        if (codeNumber >= 70 && codeNumber <= 72) {
            return {
                codeNumber,
                materialName: GLASS_CODES[codeNumber] || "Clear Glass",
            };
        }
        if (codeNumber === 40 || codeNumber === 41) {
            return {
                codeNumber,
                materialName: METAL_CODES[codeNumber] || "Unknown Metal",
            };
        }
    }

    return { codeNumber: null, materialName: "Unknown Material" };
};

export interface MaterialScore {
    environmental_score_material_score: number;
    environmental_score_shape_ratio: number;
    material: string;
    packaging_id: string;
    shape: string;
    shape_id: string;
}

export interface AgribalyseData {
    co2_total: number;
    co2_agriculture: number;
    co2_consumption: number;
    co2_distribution: number;
    co2_packaging: number;
    co2_processing: number;
    co2_transportation: number;
}

export interface EnvironmentalScoreData {
    adjusted_score: number;
    material_scores: Record<string, MaterialScore>;
    overall_grade: string;
    packaging_score: number;
    agribalyse: AgribalyseData;
}

export interface ProductData {
    id: string;
    name: string;
    environmental_score_data: EnvironmentalScoreData;
    categories: string[];
    labels: string[];
}

export interface CarbonFootprintBreakdown {
    agriculture: { value: number; percentage: number };
    consumption: { value: number; percentage: number };
    distribution: { value: number; percentage: number };
    packaging: { value: number; percentage: number };
    processing: { value: number; percentage: number };
    transportation: { value: number; percentage: number };
}

export interface FormattedProductData {
    id: string;
    name: string;
    environmentalScore: number;
    grade: string;
    packagingScore: number;
    categories: string[];
    labels: string[];
    carbonFootprint: {
        totalCo2Per100g: number;
        totalCo2PerKg: number;
        breakdown: CarbonFootprintBreakdown;
    };
    materialBreakdown: {
        key: string;
        codeNumber: number | null;
        materialName: string;
        material: string;
        score: number;
        shape: string;
        ratio: number;
    }[];
}

/**
 * Calculates carbon footprint breakdown percentages
 * @param agribalyse - The agribalyse CO2 data
 * @returns Carbon footprint breakdown with percentages
 */
const calculateCarbonBreakdown = (
    agribalyse: AgribalyseData
): CarbonFootprintBreakdown => {
    const total = agribalyse.co2_total;

    return {
        agriculture: {
            value: agribalyse.co2_agriculture,
            percentage:
                Math.round((agribalyse.co2_agriculture / total) * 1000) / 10,
        },
        consumption: {
            value: agribalyse.co2_consumption,
            percentage:
                Math.round((agribalyse.co2_consumption / total) * 1000) / 10,
        },
        distribution: {
            value: agribalyse.co2_distribution,
            percentage:
                Math.round((agribalyse.co2_distribution / total) * 1000) / 10,
        },
        packaging: {
            value: agribalyse.co2_packaging,
            percentage:
                Math.round((agribalyse.co2_packaging / total) * 1000) / 10,
        },
        processing: {
            value: agribalyse.co2_processing,
            percentage:
                Math.round((agribalyse.co2_processing / total) * 1000) / 10,
        },
        transportation: {
            value: agribalyse.co2_transportation,
            percentage:
                Math.round((agribalyse.co2_transportation / total) * 1000) / 10,
        },
    };
};

/**
 * Retrieves and formats product information from API
 * @param productName - The product name to retrieve
 * @returns Formatted product data for frontend consumption
 */
export const getProductInfo = async (
    productName: string
): Promise<FormattedProductData> => {
    const response = await fetch(`${API_BASE_URL}/product_info`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ product_name: productName }),
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const rawDataArray = (await response.json()) as ProductData[];

    if (!rawDataArray || rawDataArray.length === 0) {
        throw new Error("No product data received");
    }

    const rawData = rawDataArray[0];

    const formattedData: FormattedProductData = {
        id: rawData.id,
        name: rawData.name,
        environmentalScore: rawData.environmental_score_data.adjusted_score,
        grade: rawData.environmental_score_data.overall_grade.toUpperCase(),
        packagingScore: rawData.environmental_score_data.packaging_score,
        categories: rawData.categories,
        labels: rawData.labels,
        carbonFootprint: {
            totalCo2Per100g: Math.round(
                rawData.environmental_score_data.agribalyse.co2_total * 100
            ),
            totalCo2PerKg: Math.round(
                rawData.environmental_score_data.agribalyse.co2_total * 1000
            ),
            breakdown: calculateCarbonBreakdown(
                rawData.environmental_score_data.agribalyse
            ),
        },
        materialBreakdown: Object.entries(
            rawData.environmental_score_data.material_scores
        ).map(([key, material]) => {
            const { codeNumber, materialName } = parseRecyclingCode(key);
            return {
                key: key,
                codeNumber,
                materialName,
                material: material.material,
                score: material.environmental_score_material_score,
                shape: material.shape ? material.shape.replace("en:", "") : "",
                ratio: material.environmental_score_shape_ratio,
            };
        }),
    };

    return formattedData;
};

export interface RecommendationItem {
    id: string;
    product_name: string;
    ecoscore_score: number;
    ecoscore_grade: string;
}

export interface RecommendationsData {
    recommendations: RecommendationItem[];
}

export interface FormattedRecommendation {
    id: string;
    name: string;
    environmentalScore: number;
    grade: string;
}

export interface FormattedRecommendationsData {
    recommendations: FormattedRecommendation[];
    count: number;
}

/**
 * Retrieves and formats product recommendations from API
 * @param categories - Array of product categories to get recommendations for
 * @returns Formatted recommendations data for frontend consumption
 */
export const getRecommendations = async (
    categories: string[]
): Promise<FormattedRecommendationsData> => {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ categories }),
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const rawData = (await response.json()) as RecommendationItem[];

    const formattedRecommendations: FormattedRecommendation[] = rawData.map(
        (item) => ({
            id: item.id,
            name: item.product_name,
            environmentalScore: item.ecoscore_score || 0,
            grade: item.ecoscore_grade
                ? item.ecoscore_grade.toUpperCase()
                : "N/A",
        })
    );

    return {
        recommendations: formattedRecommendations,
        count: formattedRecommendations.length,
    };
};
