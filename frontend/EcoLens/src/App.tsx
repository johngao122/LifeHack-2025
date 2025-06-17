import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Joyride, { STATUS } from "react-joyride";
import type { CallBackProps, Step } from "react-joyride";
import { cleanSearchTerm } from "./utils/productCleaner";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";

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
    const [showSettings, setShowSettings] = useState(false);
    const [autoPopupEnabled, setAutoPopupEnabled] = useState(true);

    const [runTutorial, setRunTutorial] = useState(false);

    const tutorialSteps: Step[] = [
        {
            target: ".tutorial-welcome",
            content:
                "👋 Welcome to EcoLens! Let me show you how to track the environmental impact of food products.",
            placement: "center",
            disableBeacon: true,
        },
        {
            target: ".tutorial-search-input",
            content:
                "🔍 Start by typing any food product name here. Try to be specific but avoid quantities, sizes, or brand details.",
            placement: "bottom",
        },
        {
            target: ".tutorial-search-button",
            content:
                "📊 Click this button to analyze the sustainability metrics of your food product.",
            placement: "top",
        },
        {
            target: ".tutorial-tips",
            content:
                "💡 These tips help you get the best results from your searches.",
            placement: "top",
        },
        {
            target: ".tutorial-settings-button",
            content:
                "⚙️ Access settings here to customize your EcoLens experience. I'll open it for you!",
            placement: "bottom-end",
            disableBeacon: true,
        },
        {
            target: ".tutorial-auto-popup-info",
            content:
                "🔔 When auto-popup is enabled, EcoLens will automatically detect food products while you browse shopping websites. When a valid product is found, a popup will appear asking if you want to generate a sustainability report for that product.",
            placement: "bottom",
        },
        {
            target: ".tutorial-welcome",
            content:
                "🎉 You're all set! Start tracking your food's environmental impact. The extension will also work automatically on shopping sites.",
            placement: "center",
        },
    ];

    useEffect(() => {
        chrome.storage.sync.get(
            ["autoPopupEnabled", "hasSeenTutorial"],
            (result) => {
                if (result.autoPopupEnabled !== undefined) {
                    setAutoPopupEnabled(result.autoPopupEnabled);
                }

                if (!result.hasSeenTutorial) {
                    setRunTutorial(true);
                }
            }
        );
    }, []);

    const handleTutorialCallback = (data: CallBackProps) => {
        const { status, type, index } = data;

        if (type === "step:after" && index === 4) {
            setTimeout(() => setShowSettings(true), 100);
        }

        if (type === "step:before" && index === 5) {
            if (!showSettings) {
                setShowSettings(true);
            }
        }

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTutorial(false);

            if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.sync.set({ hasSeenTutorial: true });
            }

            setShowSettings(false);
        }
    };

    const startTutorial = () => {
        setRunTutorial(true);
        setShowSettings(true);
    };

    const handleSettingsToggle = async (enabled: boolean) => {
        setAutoPopupEnabled(enabled);

        chrome.storage.sync.set({ autoPopupEnabled: enabled });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateAutoPopup",
                    enabled: enabled,
                });
            }
        });
    };

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
        if (confidence >= 0.8) return "text-emerald-600";
        if (confidence >= 0.6) return "text-amber-600";
        return "text-red-500";
    };

    const getConfidenceText = (confidence: number) => {
        if (confidence >= 0.8) return "High";
        if (confidence >= 0.6) return "Medium";
        return "Low";
    };

    return (
        <div className="w-96 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen tutorial-welcome">
            <Joyride
                steps={tutorialSteps}
                run={runTutorial}
                callback={handleTutorialCallback}
                continuous={true}
                showProgress={true}
                showSkipButton={true}
                scrollToFirstStep={true}
                styles={{
                    options: {
                        primaryColor: "#059669",
                        backgroundColor: "#ffffff",
                        textColor: "#374151",
                        zIndex: 10000,
                    },
                    tooltip: {
                        borderRadius: "12px",
                    },
                    buttonNext: {
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        borderRadius: "8px",
                        outline: "none",
                        boxShadow: "none",
                    },
                    buttonBack: {
                        color: "#6b7280",
                    },
                    buttonSkip: {
                        color: "#9ca3af",
                    },
                }}
                locale={{
                    back: "← Back",
                    close: "Close",
                    last: "Finish",
                    next: "Next →",
                    skip: "Skip tour",
                }}
            />

            {/* Header Section */}
            <div className="bg-white/70 backdrop-blur-sm border-b border-green-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                                repeatDelay: 3,
                                ease: "easeInOut",
                            }}
                            className="w-8 h-8"
                        />
                        <div>
                            <h1 className="text-base font-bold text-gray-800">
                                EcoLens Food Tracker
                            </h1>
                            <p className="text-sm text-gray-600">
                                Make informed, greener choices
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={startTutorial}
                            className="!h-15 !w-15 !p-0 !text-gray-600 hover:!text-emerald-600 hover:!bg-emerald-50 !rounded-full !transition-colors !border-0 !bg-transparent hover:!border-0 !text-xl"
                            title="Start Tutorial"
                        >
                            🎓
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (runTutorial) {
                                    setShowSettings(true);
                                } else {
                                    setShowSettings(!showSettings);
                                }
                            }}
                            className="tutorial-settings-button !h-15 !w-15 !p-0 !text-gray-600 hover:!text-emerald-600 hover:!bg-emerald-50 !rounded-full !transition-colors !border-0 !bg-transparent hover:!border-0 !text-xl"
                            title="Settings"
                        >
                            ⚙️
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Settings Panel */}
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-emerald-200 bg-emerald-50/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-emerald-800 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        ⚙️ Settings
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSettings(false)}
                                        className="!h-6 !w-6 !p-0 !text-emerald-600 hover:!text-emerald-800 hover:!bg-emerald-100 !rounded-full !border-0 !bg-transparent hover:!border-0"
                                    >
                                        ✕
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between tutorial-auto-popup-info">
                                    <div className="flex-1">
                                        <p className="text-sm text-emerald-800 font-medium">
                                            Automatic Pop-ups
                                        </p>
                                        <p className="text-xs text-emerald-600 mt-1">
                                            Show sustainability alerts when
                                            browsing food products
                                        </p>
                                    </div>
                                    <Switch
                                        checked={autoPopupEnabled}
                                        onCheckedChange={handleSettingsToggle}
                                        className="!bg-gray-300 data-[state=checked]:!bg-green-600 !border-0"
                                        style={{
                                            backgroundColor: autoPopupEnabled
                                                ? "#059669"
                                                : "#d1d5db",
                                            borderColor: "transparent",
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Search Section */}
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Search for food products..."
                            className="tutorial-search-input w-full p-4 text-sm border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-all"
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
                                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                            >
                                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                            </motion.div>
                        )}
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={loading || !searchTerm.trim()}
                        className="tutorial-search-button !w-full !bg-gradient-to-r !from-emerald-600 !to-green-600 hover:!from-emerald-700 hover:!to-green-700 disabled:!from-gray-300 disabled:!to-gray-300 !text-white disabled:!text-gray-600 !font-medium !py-3 !px-6 !rounded-xl !transition-all !shadow-sm hover:!shadow-md disabled:!shadow-none !border-0"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Analyzing...
                            </span>
                        ) : (
                            "🔍 Analyze Sustainability"
                        )}
                    </Button>
                </div>

                {/* Tips Section */}
                <Card className="tutorial-tips border-amber-300 bg-gradient-to-br from-amber-100 to-yellow-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-amber-900 font-semibold flex items-center gap-2">
                            💡 Quick Tips
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="text-amber-700 text-xs mt-0.5 font-medium">
                                •
                            </span>
                            <p className="text-xs text-amber-800 font-medium">
                                Try not to include quantities, sizes, or brand
                                details
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-amber-700 text-xs mt-0.5 font-medium">
                                •
                            </span>
                            <p className="text-xs text-amber-800 font-medium">
                                Remove quantities (2kg, 500ml) and sizes (large,
                                small)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading State */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                    >
                        <motion.img
                            src="/ecolens_transparent.png"
                            alt="EcoLens Logo"
                            animate={{
                                scale: [1, 1.2, 1],
                                y: [0, -10, 0, -5, 0],
                                opacity: [0.7, 1, 0.7],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="w-16 h-16 mx-auto mb-4"
                        />
                        <h3 className="text-emerald-700 font-semibold text-base mb-2">
                            Analyzing Environmental Impact
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Calculating carbon footprint and sustainability
                            metrics...
                        </p>
                    </motion.div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Analysis Results
                            </h2>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                                {searchResults.length} Found
                            </span>
                        </div>

                        <div className="space-y-3">
                            {searchResults.map((product, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="border-gray-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-800 text-sm">
                                                        {product.cleanedName}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Original: {product.name}
                                                    </p>
                                                    <p className="text-xs text-emerald-600 mt-1">
                                                        Search term:{" "}
                                                        {cleanSearchTerm(
                                                            product.cleanedName
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">
                                                            Confidence:
                                                        </span>
                                                        <span
                                                            className={`text-xs font-semibold ${getConfidenceColor(
                                                                product.confidence
                                                            )}`}
                                                        >
                                                            {getConfidenceText(
                                                                product.confidence
                                                            )}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                        {product.source}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* No Results State */}
                {hasSearched && !loading && searchResults.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="text-4xl mb-4">🤔</div>
                        <h3 className="text-gray-700 font-medium text-base mb-2">
                            No Results Found
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Try a different search term or be more specific.
                        </p>
                    </motion.div>
                )}

                {/* Welcome State */}
                {!hasSearched && !loading && (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">👁️</div>
                        <h3 className="text-gray-700 font-medium text-lg mb-2">
                            Ready to Analyze Food Products
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Enter a product name above to get started
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-green-100 bg-white/50 backdrop-blur-sm">
                <p className="text-xs text-gray-400 text-center">
                    EcoLens v1.2
                </p>
            </div>
        </div>
    );
}

export default App;
