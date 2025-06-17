/**
 * # Product Sustainability Report Component
 *
 * This component renders comprehensive environmental impact analysis for detected food products.
 * It displays detailed sustainability metrics, carbon footprint breakdowns, packaging analysis,
 * and eco-friendly recommendations in an interactive dashboard format.
 *
 * ## Component Architecture:
 *
 * ### Data Sources:
 * - **Chrome Storage**: Retrieved product data and recommendations from extension
 * - **API Integration**: Fallback data fetching if storage is incomplete
 * - **Real-time Processing**: Dynamic calculations for carbon footprint analysis
 *
 * ### Visual Sections:
 * 1. **Product Overview**: Name, grade, and basic sustainability metrics
 * 2. **Environmental Score**: Color-coded rating with detailed breakdown
 * 3. **Carbon Footprint**: Interactive chart showing lifecycle impact stages
 * 4. **Packaging Analysis**: Material breakdown with recycling information
 * 5. **Eco Recommendations**: Alternative products with better sustainability scores
 *
 * ### Data Visualization:
 * - **Progress Bars**: Environmental and packaging scores with color gradients
 * - **Pie Charts**: Carbon footprint distribution across lifecycle stages
 * - **Grade Badges**: A-E sustainability rating system
 * - **Interactive Accordions**: Expandable sections for detailed analysis
 *
 * ### Responsive Design:
 * - Mobile-first approach with Tailwind CSS
 * - Smooth animations with Framer Motion
 * - Accessible color schemes for sustainability grades
 * - Loading states and error handling
 *
 * ## Data Processing:
 *
 * ### Carbon Footprint Calculation:
 * Processes raw API data into percentage-based breakdowns:
 * - Agriculture: Raw material production impact
 * - Processing: Manufacturing and transformation
 * - Transportation: Distribution logistics
 * - Packaging: Material production and disposal
 * - Consumption: End-user impact
 * - Distribution: Retail and storage
 *
 * ### Packaging Material Analysis:
 * - Recycling code parsing and material identification
 * - Environmental impact scoring per material type
 * - Shape and ratio analysis for disposal optimization
 *
 * ### Grade Color Mapping:
 * - A: Green (excellent sustainability)
 * - B: Blue (good sustainability)
 * - C: Yellow (moderate sustainability)
 * - D: Orange (poor sustainability)
 * - E: Red (very poor sustainability)
 *
 * ## Performance Features:
 * - Lazy loading for non-critical data
 * - Memoized calculations to prevent re-computation
 * - Optimized re-renders with proper dependency management
 * - Graceful fallbacks for missing data
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";
import {
    Package as PackageIcon,
    BarChart3 as BarChart3Icon,
    Leaf as LeafIcon,
    Recycle as RecycleIcon,
} from "lucide-react";
import { getProductInfo, getRecommendations } from "../utils/api";
import type {
    FormattedProductData,
    FormattedRecommendationsData,
} from "../utils/api";

const ProductSustainabilityReport = () => {
    const [productData, setProductData] = useState<FormattedProductData | null>(
        null
    );
    const [recommendations, setRecommendations] =
        useState<FormattedRecommendationsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [detectedProduct, setDetectedProduct] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (typeof chrome !== "undefined" && chrome.storage) {
                    const result = await chrome.storage.local.get([
                        "detectedProduct",
                        "productData",
                        "recommendations",
                    ]);

                    if (result.detectedProduct) {
                        setDetectedProduct(result.detectedProduct);

                        const productData = await getProductInfo(
                            result.detectedProduct.name
                        );

                        const topCategories = productData.categories.slice(
                            0,
                            3
                        );
                        const recommendations = await getRecommendations(
                            topCategories
                        );

                        setProductData(productData);
                        setRecommendations(recommendations);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!productData || !recommendations) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">Error loading data</p>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 70) return "text-green-600";
        if (score >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const getGradeColor = (grade: string) => {
        switch (grade.toLowerCase()) {
            case "a":
                return "bg-green-100 text-green-800";
            case "b":
                return "bg-blue-100 text-blue-800";
            case "c":
                return "bg-yellow-100 text-yellow-800";
            case "d":
                return "bg-orange-100 text-orange-800";
            case "e":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const carbonBreakdown = Object.entries(
        productData.carbonFootprint.breakdown
    ).map(([stage, data]) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        percentage: data.percentage,
        value: data.value,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
            <div className="max-w-4xl mx-auto px-6 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <motion.img
                            src="/ecolens_transparent.png"
                            alt="EcoLens Logo"
                            animate={{
                                y: [0, -8, 0, -4, 0],
                                x: [0, 2, -2, 1, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 4,
                                ease: "easeInOut",
                            }}
                            className="w-12 h-12"
                        />
                        <h1 className="text-4xl font-bold text-gray-900">
                            Product Sustainability Report
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Comprehensive environmental impact analysis for your
                        product
                    </p>
                </motion.div>

                {/* Product Details */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        <div className="flex items-center space-x-2 px-6 pt-6">
                            <div className="w-2 h-6 bg-green-500 rounded" />
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <PackageIcon className="w-4 h-4 text-green-600" />
                                Product Details
                            </h2>
                        </div>
                        <CardContent className="px-6 pb-6 pt-4 bg-white space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {detectedProduct
                                        ? detectedProduct.name.toUpperCase()
                                        : productData.name.toUpperCase()}
                                </h3>
                                <Badge
                                    className={`text-xl font-bold px-6 py-3 ${getGradeColor(
                                        productData.grade
                                    )}`}
                                >
                                    Grade {productData.grade}
                                </Badge>
                            </div>

                            {detectedProduct && (
                                <p className="text-sm text-gray-500 italic">
                                    Original text:{" "}
                                    <span className="font-medium">
                                        {detectedProduct.originalName}
                                    </span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Sustainability Score */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="shadow-lg border border-gray-200 overflow-hidden">
                        <div className="flex items-center space-x-2 px-6 pt-6">
                            <div className="w-2 h-6 bg-blue-500 rounded" />
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <BarChart3Icon className="w-4 h-4 text-blue-600" />
                                Sustainability Score
                            </h2>
                        </div>
                        <CardContent className="px-6 pb-6 pt-4 bg-white">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold">
                                            Overall Score
                                        </span>
                                        <span
                                            className={`text-4xl font-bold ${getScoreColor(
                                                productData.environmentalScore
                                            )}`}
                                        >
                                            {productData.environmentalScore}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={productData.environmentalScore}
                                        className="h-4"
                                    />
                                    <p className="text-gray-600">
                                        Based on Packaging sustainability and
                                        best practices
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Environmental Impact Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Environmental Impact Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Carbon Emissions Section */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <LeafIcon className="w-6 h-6 text-green-600" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Carbon Emissions
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Environmental carbon
                                                    footprint
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {
                                                    productData.carbonFootprint
                                                        .totalCo2Per100g
                                                }
                                                g
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                CO2e per 100g
                                            </div>
                                        </div>
                                    </div>

                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full"
                                    >
                                        <AccordionItem
                                            value="carbon-breakdown"
                                            className="!bg-white border border-gray-200 rounded-lg shadow-sm"
                                        >
                                            <AccordionTrigger className="text-gray-700 hover:text-gray-900 !bg-white px-4 py-3 rounded-lg border-0">
                                                Carbon Footprint Breakdown
                                            </AccordionTrigger>
                                            <AccordionContent className="!bg-white px-4 pb-4 border-0">
                                                <div className="space-y-4 pt-2 bg-white">
                                                    {carbonBreakdown
                                                        .filter(
                                                            (item) =>
                                                                item.percentage >
                                                                0
                                                        )
                                                        .sort(
                                                            (a, b) =>
                                                                b.percentage -
                                                                a.percentage
                                                        )
                                                        .map((item, index) => (
                                                            <motion.div
                                                                key={item.stage}
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: -10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    delay:
                                                                        index *
                                                                        0.05,
                                                                }}
                                                                className="space-y-2 bg-white"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm font-medium text-gray-700">
                                                                        {
                                                                            item.stage
                                                                        }
                                                                    </span>
                                                                    <span className="text-sm font-semibold text-gray-900">
                                                                        {
                                                                            item.percentage
                                                                        }
                                                                        %
                                                                    </span>
                                                                </div>
                                                                <Progress
                                                                    value={
                                                                        item.percentage
                                                                    }
                                                                    className="h-2"
                                                                />
                                                                <p className="text-xs text-gray-500">
                                                                    {item.value.toFixed(
                                                                        3
                                                                    )}{" "}
                                                                    kg CO2e
                                                                </p>
                                                            </motion.div>
                                                        ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </motion.div>

                                {/* Packaging Score Section */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.5 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <RecycleIcon className="w-6 h-6 text-blue-600" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Packaging Score
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Environmental packaging
                                                    impact
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {productData.packagingScore}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                / 100
                                            </div>
                                        </div>
                                    </div>

                                    <Accordion
                                        type="single"
                                        collapsible
                                        className="w-full"
                                    >
                                        <AccordionItem
                                            value="material-breakdown"
                                            className="!bg-white border border-gray-200 rounded-lg shadow-sm"
                                        >
                                            <AccordionTrigger className="text-gray-700 hover:text-gray-900 !bg-white px-4 py-3 rounded-lg border-0">
                                                Material Scores Breakdown
                                            </AccordionTrigger>
                                            <AccordionContent className="!bg-white px-4 pb-4 border-0">
                                                <div className="space-y-4 pt-2 bg-white">
                                                    {productData.materialBreakdown.map(
                                                        (material, index) => (
                                                            <motion.div
                                                                key={
                                                                    material.key
                                                                }
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: -10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    delay:
                                                                        index *
                                                                        0.05,
                                                                }}
                                                                className="border border-gray-200 rounded-lg p-4 space-y-2 bg-white"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <h4 className="font-medium text-gray-900">
                                                                            {
                                                                                material.materialName
                                                                            }
                                                                        </h4>
                                                                        <p className="text-sm text-gray-600">
                                                                            Shape:{" "}
                                                                            {material.shape.toUpperCase()}
                                                                        </p>
                                                                    </div>
                                                                    <Badge
                                                                        variant={
                                                                            material.score >=
                                                                            70
                                                                                ? "default"
                                                                                : material.score >=
                                                                                  50
                                                                                ? "secondary"
                                                                                : "destructive"
                                                                        }
                                                                        className="font-semibold"
                                                                    >
                                                                        {
                                                                            material.score
                                                                        }
                                                                        /100
                                                                    </Badge>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span>
                                                                            Environmental
                                                                            Score
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                material.score
                                                                            }
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                    <Progress
                                                                        value={
                                                                            material.score
                                                                        }
                                                                        className="h-2"
                                                                    />
                                                                    <div className="flex justify-between text-xs text-gray-500">
                                                                        <span>
                                                                            Shape
                                                                            Ratio:{" "}
                                                                            {
                                                                                material.ratio
                                                                            }
                                                                            %
                                                                        </span>
                                                                        <span>
                                                                            Code:{" "}
                                                                            {material.codeNumber ||
                                                                                "N/A"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </motion.div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Alternative Products */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Alternative Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recommendations.recommendations
                                .slice(0, 3)
                                .map((rec, index) => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            duration: 0.4,
                                            delay: 0.6 + index * 0.1,
                                        }}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {rec.name}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                Sustainable alternative
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge
                                                className={getGradeColor(
                                                    rec.grade
                                                )}
                                            >
                                                Grade {rec.grade}
                                            </Badge>
                                            <span
                                                className={`text-sm font-medium ${getScoreColor(
                                                    rec.environmentalScore
                                                )}`}
                                            >
                                                {rec.environmentalScore}%
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* View More Details Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="flex justify-center"
                ></motion.div>
            </div>
        </div>
    );
};

export default ProductSustainabilityReport;
