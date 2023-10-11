import 'jest-canvas-mock';
const { chrome } = require('jest-chrome')
chrome.runtime.id = "testid";
chrome.tabs.query = () => []
chrome.runtime.sendMessage.mockImplementation(
    (message, callback) => {
        callback("response")
    },
)
Object.assign(global, { chrome })

