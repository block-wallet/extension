/**
 * Test script for Ledger account derivation
 * Use this to diagnose issues with Ledger account retrieval
 * 
 * Run with: node scripts/test-ledger.js
 */

const Transport = require('@ledgerhq/hw-transport-node-hid').default;
const AppEth = require('@ledgerhq/hw-app-eth').default;
const { ethers } = require('ethers');

// HD Paths to test
const HD_PATHS = [
    "m/44'/60'/0'/0", // Ledger Legacy
    "m/44'/60'/0'/0/0", // Ledger Live
    "m/44'/60'/0'", // Alternative
];

// Number of accounts to check per path
const ACCOUNTS_PER_PATH = 5;

async function main() {
    try {
        console.log("Attempting to connect to Ledger device...");
        const transport = await Transport.create();

        console.log("Connected! Opening Ethereum app...");
        const eth = new AppEth(transport);

        try {
            // Check if Ethereum app is open
            const appConfig = await eth.getAppConfiguration();
            console.log("Ethereum app is open. Version:", appConfig.version);
        } catch (e) {
            console.error("ERROR: Ethereum app is not open or accessible", e.message);
            console.log("Please open the Ethereum app on your Ledger and try again.");
            await transport.close();
            return;
        }

        console.log("\n========== TESTING HD PATHS ==========");
        // Test each HD path
        for (const hdPath of HD_PATHS) {
            console.log(`\nTesting HD Path: ${hdPath}`);

            try {
                // Retrieve accounts for this path
                for (let i = 0; i < ACCOUNTS_PER_PATH; i++) {
                    const path = hdPath.endsWith('/0') ?
                        hdPath.substring(0, hdPath.length - 1) + i :
                        `${hdPath}/${i}`;

                    try {
                        const result = await eth.getAddress(path);
                        const checksumAddress = ethers.utils.getAddress(result.address);

                        console.log(`Account #${i}: ${checksumAddress} (${path})`);
                    } catch (error) {
                        console.error(`Failed to get address for path ${path}:`, error.message);
                    }
                }
            } catch (error) {
                console.error(`Error testing HD path ${hdPath}:`, error.message);
            }
        }

        await transport.close();
        console.log("\nTest completed successfully!");

    } catch (error) {
        console.error("Failed to connect to Ledger:", error.message);
        console.log("Make sure your Ledger is:");
        console.log("1. Connected to your computer");
        console.log("2. Unlocked");
        console.log("3. Has the Ethereum app open");
    }
}

main().catch(console.error); 