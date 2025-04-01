// Polyfill Node.js Buffer for the browser
global.Buffer = global.Buffer || require('buffer/').Buffer;
window.Buffer = window.Buffer || require('buffer/').Buffer;

// Export Ledger libraries for use in the offscreen document
const TransportWebHID = require('@ledgerhq/hw-transport-webhid').default;
const Eth = require('@ledgerhq/hw-app-eth').default;
const { TransportError, TransportStatusError } = require('@ledgerhq/errors');
const { log } = require('@ledgerhq/logs');

// Export everything as a global object
module.exports = {
    TransportWebHID,
    Eth,
    TransportError,
    TransportStatusError,
    log
}; 