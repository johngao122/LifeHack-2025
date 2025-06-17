import mockData from "../data/mock-data.json";
import mockRecommendations from "../data/mock-reccomendations.json";

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
 * @param code - The recycling code (e.g., "PP_5", "PAP_21", "GL_70")
 * @returns Object with code number and material name
 */
const parseRecyclingCode = (
    code: string
): { codeNumber: number | null; materialName: string } => {
    const numberMatch = code.match(/(\d+)$/);
    const codeNumber = numberMatch ? parseInt(numberMatch[1]) : null;

    if (!codeNumber) {
        return { codeNumber: null, materialName: "Unknown Material" };
    }

    if (code.includes("PP") || (codeNumber >= 1 && codeNumber <= 7)) {
        return {
            codeNumber,
            materialName: PLASTIC_CODES[codeNumber] || "Unknown Plastic",
        };
    }

    if (code.includes("PAP") || code.includes("C_PAP")) {
        return {
            codeNumber,
            materialName: PAPER_CODES[codeNumber] || "Unknown Paper Product",
        };
    }

    if (code.includes("GL")) {
        return {
            codeNumber,
            materialName: GLASS_CODES[codeNumber] || "Unknown Glass",
        };
    }

    if (code.includes("FE") || code.includes("ALU")) {
        return {
            codeNumber,
            materialName: METAL_CODES[codeNumber] || "Unknown Metal",
        };
    }

    return { codeNumber, materialName: "Unknown Material" };
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
    categories: string;
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
 * Retrieves and formats product information from mock data
 * @param productName - The product name to retrieve (optional, defaults to mock data)
 * @returns Formatted product data for frontend consumption
 */
export const getProductInfo = async (): Promise<FormattedProductData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rawData = mockData as ProductData;

    const formattedData: FormattedProductData = {
        id: rawData.id,
        name: rawData.name,
        environmentalScore: rawData.environmental_score_data.adjusted_score,
        grade: rawData.environmental_score_data.overall_grade.toUpperCase(),
        packagingScore: rawData.environmental_score_data.packaging_score,
        categories: rawData.categories.split(",").map((cat) => cat.trim()),
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
                shape: material.shape.replace("en:", ""),
                ratio: material.environmental_score_shape_ratio,
            };
        }),
    };

    return formattedData;
};

export interface RecommendationItem {
    id: string;
    name: string;
    environmental_score_data: {
        adjusted_score: number;
        overall_grade: string;
    };
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
 * Retrieves and formats product recommendations from mock data
 * @returns Formatted recommendations data for frontend consumption
 */
export const getRecommendations =
    async (): Promise<FormattedRecommendationsData> => {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const rawData = mockRecommendations as RecommendationsData;

        const formattedRecommendations: FormattedRecommendation[] =
            rawData.recommendations.map((item) => ({
                id: item.id,
                name: item.name,
                environmentalScore:
                    item.environmental_score_data.adjusted_score,
                grade: item.environmental_score_data.overall_grade.toUpperCase(),
            }));

        return {
            recommendations: formattedRecommendations,
            count: formattedRecommendations.length,
        };
    };
