// hardware-wallet-bridge-navigation.js
// This script handles navigation logic after successful hardware wallet connection

// Listen for the "Successfully connected" message from hardware-wallet-bridge.js
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target.id === 'status') {
            const statusElement = mutation.target;
            const hasSuccessClass = statusElement.classList.contains('success');
            const text = statusElement.textContent || statusElement.innerText;

            if (hasSuccessClass && text &&
                (text.includes('Successfully connected to LEDGER') ||
                 text.includes('Successfully connected to TREZOR') ||
                 text.includes('Successfully connected to KEYSTONE'))) {

                const deviceType = text.includes('LEDGER') ? 'LEDGER' :
                                 text.includes('TREZOR') ? 'TREZOR' : 'KEYSTONE';

                console.log(`Detected successful ${deviceType} connection via status observer`);

                // Store connection success in localStorage as a backup
                try {
                    localStorage.setItem('hw_bridge_result', JSON.stringify({
                        timestamp: Date.now(),
                        success: true,
                        device: deviceType,
                        source: 'mutation_observer'
                    }));
                } catch (e) {
                    console.error('Failed to store result in localStorage:', e);
                }

                // The main script now handles showing action buttons,
                // so we don't need to create duplicate buttons here
                console.log('Action buttons should be handled by main bridge script');
            }
        }
    });
});

// Start observing the status element when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        observer.observe(statusElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        console.log('Started observing status element for changes');
    } else {
        console.error('Status element not found for observation');
    }
});

// Listen for the new custom event from the hardware-wallet-bridge.js
window.addEventListener('hardwareWalletConnected', (event) => {
    console.log('Received hardwareWalletConnected event:', event.detail);

    const { success, device, timestamp } = event.detail;

    if (success && device) {
        // Store connection success in localStorage as a backup
        try {
            localStorage.setItem('hw_bridge_result', JSON.stringify({
                timestamp: timestamp || Date.now(),
                success: true,
                device: device,
                source: 'custom_event'
            }));
            console.log(`Stored ${device} connection success in localStorage`);
        } catch (e) {
            console.error('Failed to store result in localStorage:', e);
        }

        // Enhanced navigation logic with better URL handling
        const navigateToAccounts = () => {
            try {
                // Try different URL formats based on the environment
                const extensionUrl = chrome?.runtime?.getURL
                    ? chrome.runtime.getURL(`tab.html#/hardware-wallet/accounts?vendor=${device}`)
                    : `${window.location.origin}/tab.html#/hardware-wallet/accounts?vendor=${device}`;

                console.log(`Navigating to accounts page: ${extensionUrl}`);
                window.location.href = extensionUrl;
            } catch (urlError) {
                console.error('Error constructing navigation URL:', urlError);
                // Fallback to relative URL
                window.location.href = `tab.html#/hardware-wallet/accounts?vendor=${device}`;
            }
        };

        // Set up automatic navigation with longer delay for better UX
        setTimeout(navigateToAccounts, 3000);
    }
});

// Handle page visibility changes to ensure proper cleanup
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page became hidden, connection process may continue in background');
    } else {
        console.log('Page became visible, checking connection status');
        // Check if we have a stored result and should navigate
        try {
            const storedResult = localStorage.getItem('hw_bridge_result');
            if (storedResult) {
                const result = JSON.parse(storedResult);
                const timeDiff = Date.now() - result.timestamp;

                // If the result is recent (less than 30 seconds) and successful
                if (timeDiff < 30000 && result.success) {
                    console.log('Found recent successful connection, preparing for navigation');
                    // Update status to show the stored result
                    const statusElement = document.getElementById('status');
                    if (statusElement && !statusElement.classList.contains('success')) {
                        statusElement.classList.remove('loading', 'error', 'warning');
                        statusElement.classList.add('success');
                        statusElement.innerHTML = `
                            <span class="status-icon">✅</span>
                            Successfully connected to ${result.device}
                        `;

                        // Show action buttons
                        const actionButtons = document.getElementById('actionButtons');
                        if (actionButtons) {
                            actionButtons.style.display = 'block';
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error checking stored connection result:', e);
        }
    }
});

// Cleanup function for when the page is about to be unloaded
window.addEventListener('beforeunload', () => {
    console.log('Hardware wallet bridge page is being unloaded');
    // Clean up the mutation observer
    if (observer) {
        observer.disconnect();
    }
});
