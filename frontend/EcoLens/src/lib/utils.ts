/**
 * # Utility Functions for Class Name Management
 *
 * This module provides utility functions for handling CSS class names in the UI components.
 * It combines clsx and tailwind-merge for optimal Tailwind CSS class handling.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges CSS class names with Tailwind CSS conflict resolution.
 *
 * This function uses clsx for conditional class handling and tailwind-merge
 * to resolve conflicting Tailwind classes (e.g., "text-red-500" overrides "text-blue-500").
 *
 * @param inputs - Array of class values (strings, objects, arrays, etc.)
 * @returns Merged and optimized class string
 *
 * @example
 * ```ts
 * cn("px-4 py-2", "bg-blue-500", { "text-white": isActive })
 * // Returns: "px-4 py-2 bg-blue-500 text-white"
 *
 * cn("text-red-500", "text-blue-500")
 * // Returns: "text-blue-500" (conflicting classes resolved)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
