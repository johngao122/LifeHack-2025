/**
 * Utility Functions for Class Name Management
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges CSS class names with Tailwind CSS conflict resolution.
 * @param inputs - Array of class values (strings, objects, arrays, etc.)
 * @returns Merged and optimized class string
 * @example
 * ```ts
 * cn("px-4 py-2", "bg-blue-500", { "text-white": isActive })
 * // Returns: "px-4 py-2 bg-blue-500 text-white"
 * cn("text-red-500", "text-blue-500")
 * // Returns: "text-blue-500" (conflicting classes resolved)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
