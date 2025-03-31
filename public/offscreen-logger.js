// Initialize logging
const logElement = document.getElementById('log');

/**
 * Log a message to both the UI and console
 * @param {string} message - The message to log
 * @param {boolean} isError - Whether this is an error message
 */
function logMessage(message, isError = false) {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (isError) {
        entry.style.color = '#d32f2f';
    }
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;

    // Also log to console
    if (isError) {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Log initialization
logMessage('Offscreen document initialized');

// Set up error handling
window.addEventListener('error', (event) => {
    logMessage(`Error: ${event.message}`, true);
});

// Export logging function for use in other scripts
window.logMessage = logMessage; 