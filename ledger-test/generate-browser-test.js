#!/usr/bin/env node

/**
 * Generate Browser Test HTML
 * 
 * This script generates the browser-based WebHID test HTML file
 */

const fs = require('fs');
const path = require('path');
const browserTest = require('./browser-test');

const OUTPUT_FILE = path.join(__dirname, 'ledger-webhid-test.html');

/**
 * Generate the browser test HTML file
 */
function generateBrowserTest() {
    console.log('Generating browser test HTML file...');

    // Get the HTML template from the browser-test module
    const html = browserTest;

    // Just write the HTML file directly
    // The template strings in the HTML will be evaluated when the HTML is loaded in the browser
    fs.writeFileSync(OUTPUT_FILE, html);

    console.log(`Browser test HTML file created: ${OUTPUT_FILE}`);
    console.log('\nTo use this test:');
    console.log('1. Open the HTML file in Chrome or Edge (browsers that support WebHID)');
    console.log('2. Click the "Start Test" button');
    console.log('3. When prompted, select your Ledger device');
}

// Run the generator
generateBrowserTest(); 