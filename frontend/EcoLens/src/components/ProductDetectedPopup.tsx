import { motion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ProductDetectedPopupProps {
    isVisible: boolean;
    onClose: () => void;
    productCount: number;
}

export function ProductDetectedPopup({
    isVisible,
    onClose,
    productCount,
}: ProductDetectedPopupProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    if (!isVisible) return null;

    const handlePopupClick = () => {
        setIsDialogOpen(true);
    };

    return (
        <>
            {/* Backdrop overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-40"
                onClick={onClose}
            />

            {/* Popup */}
            <motion.div
                initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 20,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                }}
                exit={{
                    opacity: 0,
                    scale: 0.8,
                    y: 20,
                }}
                whileHover={{
                    scale: 1.05,
                    cursor: "pointer",
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-80 max-w-md"
                onClick={handlePopupClick}
            >
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                repeatDelay: 2,
                            }}
                            className="text-2xl"
                        >
                            👁️
                        </motion.div>
                    </div>
                    <div className="flex-1">
                        <p className="text-green-700 font-semibold text-sm">
                            Valid product{productCount > 1 ? "s" : ""} detected
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                            Curious about{" "}
                            {productCount > 1
                                ? "these products'"
                                : "this product's"}{" "}
                            green score?
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    >
                        ×
                    </motion.button>
                </div>

                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 pt-3 border-t border-gray-100"
                >
                    <p className="text-xs text-gray-500 text-center">
                        Click to learn more about sustainability
                    </p>
                </motion.div>
            </motion.div>

            {/* Dialog for detailed view */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <div className="text-center py-6">
                        <div className="text-4xl mb-4">🌱</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Green Score Analysis
                        </h3>
                        <p className="text-gray-600 mb-4">
                            We detected {productCount} product
                            {productCount > 1 ? "s" : ""} on this page. Our AI
                            will analyze their environmental impact and
                            sustainability metrics.
                        </p>
                        <div className="space-y-2">
                            <Button
                                onClick={() => setIsDialogOpen(false)}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                Analyze Environmental Impact
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="w-full"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
