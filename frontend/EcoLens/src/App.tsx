import { useState, useEffect } from "react";
import "./App.css";
import { cleanSearchTerm } from "./utils/productCleaner";
import { ProductDetectedPopup } from "./components/ProductDetectedPopup";

interface ProductInfo {
    name: string;
    cleanedName: string;
    confidence: number;
    source: string;
}

function App() {
    const [products, setProducts] = useState<ProductInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUrl, setCurrentUrl] = useState<string>("");
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        getCurrentTabUrl();

        const cachedProducts = sessionStorage.getItem("ecolens-products");
        if (cachedProducts) {
            const parsedProducts = JSON.parse(cachedProducts);
            setProducts(parsedProducts);
        }

        const messageListener = (message: any) => {
            if (message.action === "productsScraped") {
                setProducts(message.products);
                setLoading(false);
                // Show popup only if products are detected AND popup hasn't been shown yet
                if (
                    message.products &&
                    message.products.length > 0 &&
                    !showPopup
                ) {
                    setShowPopup(true);
                }
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const getCurrentTabUrl = async () => {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            if (tab.url) {
                setCurrentUrl(tab.url);
            }
        } catch (error) {
            console.error("Error getting current tab URL:", error);
        }
    };

    const scrapeCurrentPage = async () => {
        setLoading(true);
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            if (!tab.id) {
                throw new Error("No active tab found");
            }

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["contentScript.js"],
                });
            } catch (injectError) {
                console.log(
                    "Content script might already be injected:",
                    injectError
                );
            }

            await new Promise((resolve) => setTimeout(resolve, 500));

            const response = await Promise.race([
                chrome.tabs.sendMessage(tab.id, { action: "scrapeProducts" }),
                new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error("Timeout waiting for content script")
                            ),
                        5000
                    )
                ),
            ]);

            if (response && response.products) {
                setProducts(response.products);
                sessionStorage.setItem(
                    "ecolens-products",
                    JSON.stringify(response.products)
                );
                // Don't show popup on manual scan
            } else {
                const cachedProducts =
                    sessionStorage.getItem("ecolens-products");
                if (cachedProducts) {
                    setProducts(JSON.parse(cachedProducts));
                } else {
                    console.warn("No products found in response or cache");
                }
            }
        } catch (error) {
            console.error("Error scraping products:", error);

            try {
                const cachedProducts =
                    sessionStorage.getItem("ecolens-products");
                if (cachedProducts) {
                    setProducts(JSON.parse(cachedProducts));
                    console.log("Loaded products from cache");
                }
            } catch (cacheError) {
                console.error("Error loading cached products:", cacheError);
            }
        } finally {
            setLoading(false);
        }
    };

    const getDomainFromUrl = (url: string) => {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return "Unknown";
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
        <div className="w-80 p-4 bg-white">
            <ProductDetectedPopup
                isVisible={showPopup}
                onClose={() => setShowPopup(false)}
                productCount={products.length}
            />

            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-800 mb-2">
                    EcoLens Food Tracker
                </h1>
                <p className="text-sm text-gray-600">
                    Scraping: {getDomainFromUrl(currentUrl)}
                </p>
            </div>

            <div className="mb-4">
                <button
                    onClick={scrapeCurrentPage}
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {loading ? "Scanning..." : "Scan for Food Products"}
                </button>
            </div>

            {products.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Food Products ({products.length})
                        </h2>
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                            Auto-detected
                        </span>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-3">
                        {products.map((product, index) => (
                            <div
                                key={index}
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
                                        {product.source.split("[")[0]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && products.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                        No food products detected. Visit a grocery store website
                        or food product page, or click "Scan for Food Products"
                        to search manually.
                    </p>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center">
                    EcoLens v1.2 - Track your carbon footprint
                </p>
            </div>
        </div>
    );
}

export default App;
