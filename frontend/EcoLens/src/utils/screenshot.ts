/**
 * Screenshot Capture Utilities
 * 
 * Provides functions for capturing and processing screenshots of web pages
 * for OpenAI-powered product analysis.
 */

export interface ScreenshotCaptureOptions {
    format?: 'png' | 'jpeg';
    quality?: number; // 0-100, for JPEG only
}

export interface ScreenshotResult {
    success: boolean;
    dataUrl?: string;
    base64Data?: string;
    error?: string;
}

/**
 * Captures a screenshot of the current active tab
 */
export async function captureActiveTabScreenshot(
    options: ScreenshotCaptureOptions = {}
): Promise<ScreenshotResult> {
    console.log('[Screenshot] Starting capture process with options:', options);
    
    try {
        // Check if we're in the right context
        if (typeof chrome === 'undefined') {
            const error = 'Chrome extension APIs not available - not running in extension context';
            console.error('[Screenshot] Context error:', error);
            return {
                success: false,
                error: error
            };
        }

        if (!chrome.tabs) {
            const error = 'Chrome tabs API not available - missing tabs permission or wrong context';
            console.error('[Screenshot] Context error:', error);
            return {
                success: false,
                error: error
            };
        }

        if (!chrome.tabs.captureVisibleTab) {
            const error = 'captureVisibleTab API not available - missing activeTab permission';
            console.error('[Screenshot] Permission error:', error);
            return {
                success: false,
                error: error
            };
        }

        // Get the current active tab
        console.log('[Screenshot] Querying for active tab...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[Screenshot] Active tabs found:', tabs.length, tabs[0]?.url);
        
        if (!tabs[0]) {
            const error = 'No active tab found';
            console.error('[Screenshot]', error);
            return {
                success: false,
                error: error
            };
        }

        // Check tab permissions
        if (!tabs[0].url || tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://')) {
            const error = `Cannot capture restricted tab: ${tabs[0].url}`;
            console.error('[Screenshot]', error);
            return {
                success: false,
                error: error
            };
        }

        // Capture the visible tab
        const captureOptions = {
            format: (options.format || 'png') as 'png' | 'jpeg',
            ...(options.format === 'jpeg' && options.quality && { quality: options.quality })
        };

        console.log('[Screenshot] Capturing visible tab with options:', captureOptions);
        
        const dataUrl = await new Promise<string>((resolve, reject) => {
            chrome.tabs.captureVisibleTab(captureOptions, (result) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = `Chrome API error: ${chrome.runtime.lastError.message}`;
                    console.error('[Screenshot] Chrome API failed:', chrome.runtime.lastError);
                    reject(new Error(errorMsg));
                } else if (!result) {
                    const errorMsg = 'Chrome API returned empty result';
                    console.error('[Screenshot]', errorMsg);
                    reject(new Error(errorMsg));
                } else {
                    console.log('[Screenshot] Chrome API success, data URL length:', result.length);
                    resolve(result);
                }
            });
        });
        
        // Extract base64 data from data URL
        if (!dataUrl.includes(',')) {
            const error = 'Invalid data URL format received from Chrome API';
            console.error('[Screenshot]', error, 'Data URL preview:', dataUrl.substring(0, 100));
            return {
                success: false,
                error: error
            };
        }
        
        const base64Data = dataUrl.split(',')[1];
        console.log('[Screenshot] Successfully extracted base64 data, length:', base64Data.length);

        return {
            success: true,
            dataUrl,
            base64Data
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Screenshot] Capture failed with error:', error);
        console.error('[Screenshot] Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: errorMessage,
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        
        return {
            success: false,
            error: `Screenshot capture failed: ${errorMessage}`
        };
    }
}

/**
 * Compresses screenshot data for API transmission
 */
export function compressScreenshotData(base64Data: string, _targetQuality: number = 0.8): string {
    // For now, return the original data
    // In a more advanced implementation, we could resize/compress the image
    return base64Data;
}

/**
 * Validates screenshot data format
 */
export function validateScreenshotData(dataUrl: string): boolean {
    try {
        // Check if it's a valid data URL
        if (!dataUrl.startsWith('data:image/')) {
            return false;
        }

        // Check if it has base64 data
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            return false;
        }

        // Try to decode base64 (basic validation)
        const base64Data = parts[1];
        atob(base64Data);
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Estimates screenshot file size in bytes
 */
export function estimateScreenshotSize(base64Data: string): number {
    // Base64 encoding increases size by ~33%
    // Each base64 character represents 6 bits, so 4 chars = 3 bytes
    return Math.floor((base64Data.length * 3) / 4);
}

/**
 * Message handlers for screenshot operations
 */
export const ScreenshotMessages = {
    CAPTURE_SCREENSHOT: 'captureScreenshot',
    SCREENSHOT_RESULT: 'screenshotResult',
    SCREENSHOT_ERROR: 'screenshotError'
} as const;

export type ScreenshotMessage = {
    action: typeof ScreenshotMessages.CAPTURE_SCREENSHOT;
    options?: ScreenshotCaptureOptions;
} | {
    action: typeof ScreenshotMessages.SCREENSHOT_RESULT;
    result: ScreenshotResult;
} | {
    action: typeof ScreenshotMessages.SCREENSHOT_ERROR;
    error: string;
};