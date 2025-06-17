/**
 * # EcoLens Background Service Worker
 *
 * This service worker handles extension-level coordination and tab management.
 * It operates in the background to provide seamless integration between
 * content scripts and the extension popup.
 *
 * ## Responsibilities:
 * - Tab creation for sustainability reports
 * - Message routing between extension components
 * - Extension lifecycle management
 *
 * ## Message Handling:
 * The service worker listens for messages from content scripts and popup:
 * - `openReportTab`: Creates new tab with sustainability report
 * - Future messages can be added here for additional functionality
 *
 * ## Architecture Notes:
 * Uses Chrome Extension Manifest V3 service worker pattern.
 * Maintains minimal state to ensure reliability across browser sessions.
 */

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
});
