// hardware-wallet-bridge-navigation.js
// This script handles navigation logic after successful hardware wallet connection

// Listen for the "Successfully connected" message from hardware-wallet-bridge.js
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target.id === 'status') {
            const text = mutation.target.textContent;
            if (text && text.includes('Successfully connected to LEDGER')) {
                console.log('Detected successful Ledger connection, navigating to accounts page...');

                // Store connection success in localStorage as a backup
                try {
                    localStorage.setItem('hw_bridge_result', JSON.stringify({
                        timestamp: Date.now(),
                        success: true,
                        device: 'LEDGER'
                    }));
                } catch (e) {
                    console.error('Failed to store result in localStorage:', e);
                }

                // Add a button to manually navigate
                const container = document.querySelector('.container');
                const btn = document.createElement('button');
                btn.innerText = 'Continue to Account Selection';
                btn.style = 'display: block; margin: 20px auto; padding: 10px 20px; background: #1E88E5; color: white; border: none; border-radius: 4px; cursor: pointer;';
                btn.onclick = () => {
                    window.location.href = chrome.runtime.getURL('tab.html#/hardware-wallet/accounts?vendor=LEDGER');
                };
                container.appendChild(btn);

                // Add a note
                const note = document.createElement('p');
                note.innerText = 'If you are not automatically redirected, click the button above.';
                note.style = 'text-align: center; color: #666;';
                container.appendChild(note);

                // Try auto-navigation after a short delay
                setTimeout(() => {
                    window.location.href = chrome.runtime.getURL('tab.html#/hardware-wallet/accounts?vendor=LEDGER');
                }, 2000);
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
            subtree: true
        });
    } else {
        console.error('Status element not found for observation');
    }
});

// Also listen for custom events from the hardware-wallet-bridge.js
window.addEventListener('ledgerConnected', (event) => {
    console.log('Received ledgerConnected event:', event.detail);
    // This is a backup method in case the mutation observer doesn't catch the status change
}); 