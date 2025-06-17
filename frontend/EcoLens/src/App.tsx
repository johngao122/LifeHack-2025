import { useState } from "react";
import { motion } from "motion/react";
import { cleanSearchTerm } from "./utils/productCleaner";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

function App() {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<ProductInfo[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        setHasSearched(true);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockResults: ProductInfo[] = [
            {
                name: searchTerm,
                cleanedName: cleanSearchTerm(searchTerm),
                confidence: 0.9,
                source: "Search Result",
            },
        ];

        setSearchResults(mockResults);
        setLoading(false);

        chrome.runtime.sendMessage({ action: "openReportTab" });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return "text-green-600";
        if (confidence >= 0.6) return "text-yellow-600";
        return "text-red-600";
    };

    const getConfidenceText = (confidence: number) => {
        if (confidence >= 0.8) return "High";
        if (confidence >= 0.6) return "Medium";
        return "Low";
    };

    return (
        <div className="w-96 p-4 bg-white">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <motion.div
                        animate={{
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 3,
                        }}
                        className="text-2xl"
                    >
                        🌱
                    </motion.div>
                    <h1 className="text-xl font-bold text-gray-800">
                        EcoLens Food Tracker
                    </h1>
                </div>
                <p className="text-sm text-gray-600">
                    Search for food products to analyze their environmental
                    impact
                </p>
            </div>

            <div className="mb-4 space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search for food products..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        disabled={loading}
                    />
                    {loading && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                        </motion.div>
                    )}
                </div>

                <Button
                    onClick={handleSearch}
                    disabled={loading || !searchTerm.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {loading ? "Analyzing..." : "🔍 Analyze Sustainability"}
                </Button>
            </div>

            {/* Tips and Warnings */}
            <Card className="mb-4 border-amber-200 bg-amber-50">
                <CardHeader>
                    <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                        💡 Quick Tips
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-xs text-amber-700">
                        💡 Tip: Try not to include quantities, sizes, or brand
                        details
                    </p>
                    <p className="text-xs text-amber-700">
                        💡 Tip: Remove quantities (2kg, 500ml), sizes (large,
                        small), and unnecessary brand details
                    </p>
                </CardContent>
            </Card>

            {loading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                >
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                        }}
                        className="text-3xl mb-3"
                    >
                        🌱
                    </motion.div>
                    <p className="text-green-700 font-semibold text-sm mb-1">
                        Analyzing Environmental Impact
                    </p>
                    <p className="text-gray-600 text-xs">
                        Calculating carbon footprint and sustainability
                        metrics...
                    </p>
                </motion.div>
            )}

            {searchResults.length > 0 && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Search Results ({searchResults.length})
                        </h2>
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                            Analyzed
                        </span>
                    </div>

                    <div className="space-y-3">
                        {searchResults.map((product, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="border rounded-lg p-3 bg-gray-50"
                            >
                                <div className="mb-2">
                                    <h3 className="font-medium text-gray-800 text-sm">
                                        {product.cleanedName}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Original: {product.name}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Search term:{" "}
                                        {cleanSearchTerm(product.cleanedName)}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span
                                        className={`font-medium ${getConfidenceColor(
                                            product.confidence
                                        )}`}
                                    >
                                        {getConfidenceText(product.confidence)}{" "}
                                        confidence
                                    </span>
                                    <span className="text-gray-400">
                                        {product.source}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {hasSearched && !loading && searchResults.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                >
                    <div className="text-2xl mb-2">🤔</div>
                    <p className="text-gray-500 text-sm">
                        No results found. Try a different search term or be more
                        specific.
                    </p>
                </motion.div>
            )}

            {!hasSearched && !loading && (
                <div className="text-center py-8">
                    <div className="text-3xl mb-3">👁️</div>
                    <p className="text-gray-500 text-sm mb-2">
                        Ready to analyze food products
                    </p>
                    <p className="text-gray-400 text-xs">
                        Enter a product name above to get started
                    </p>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center mt-3">
                    EcoLens v1.2 - Track your carbon footprint
                </p>
            </div>
        </div>
    );
}

export default App;
