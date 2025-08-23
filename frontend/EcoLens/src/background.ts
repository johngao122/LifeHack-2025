/**
 * # EcoLens Background Service Worker
 *
 * This service worker handles extension-level coordination and tab management.
 * It operates in the background to provide seamless integration between
 * content scripts and the extension popup.
 *
 * ## Responsibilities:
 * - Tab creation for sustainability reports
 * - Screenshot capture for AI-powered product analysis
 * - Message routing between extension components
 * - Extension lifecycle management
 *
 * ## Message Handling:
 * The service worker listens for messages from content scripts and popup:
 * - `openReportTab`: Creates new tab with sustainability report
 * - `captureScreenshot`: Captures screenshot of active tab for AI analysis
 * - Future messages can be added here for additional functionality
 *
 * ## Architecture Notes:
 * Uses Chrome Extension Manifest V3 service worker pattern.
 * Maintains minimal state to ensure reliability across browser sessions.
 */

import { ScreenshotMessages, captureActiveTabScreenshot } from './utils/screenshot.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "openReportTab") {
        const reportUrl = chrome.runtime.getURL("report.html");
        chrome.tabs
            .create({ url: reportUrl })
            .then((tab) => {
                sendResponse({ success: true, tabId: tab.id });
            })
            .catch((error) => {
                console.error(
                    "[EcoLens Background] Error creating tab:",
                    error
                );
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }

    if (message.action === ScreenshotMessages.CAPTURE_SCREENSHOT) {
        console.log("[EcoLens Background] Screenshot capture requested with options:", message.options);
        console.log("[EcoLens Background] Message sender:", _sender);
        
        captureActiveTabScreenshot(message.options || {})
            .then((result) => {
                console.log("[EcoLens Background] Screenshot capture completed:", {
                    success: result.success,
                    hasDataUrl: !!result.dataUrl,
                    hasBase64Data: !!result.base64Data,
                    dataUrlLength: result.dataUrl?.length || 0,
                    base64Length: result.base64Data?.length || 0,
                    error: result.error
                });
                
                if (result.success) {
                    console.log("[EcoLens Background] Sending successful response to content script");
                } else {
                    console.warn("[EcoLens Background] Screenshot capture failed:", result.error);
                }
                
                sendResponse({ 
                    action: ScreenshotMessages.SCREENSHOT_RESULT, 
                    result 
                });
            })
            .catch((error) => {
                console.error("[EcoLens Background] Screenshot capture threw error:", error);
                console.error("[EcoLens Background] Error details:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                
                sendResponse({ 
                    action: ScreenshotMessages.SCREENSHOT_ERROR, 
                    error: error.message || 'Unknown screenshot capture error'
                });
            });

        return true; // Keep message channel open for async response
    }
});
