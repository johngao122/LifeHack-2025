chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[EcoLens Background] Received message:", message);

    if (message.action === "openReportTab") {
        const reportUrl = chrome.runtime.getURL("report.html");
        chrome.tabs
            .create({ url: reportUrl })
            .then((tab) => {
                console.log("[EcoLens Background] Created report tab:", tab.id);
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
