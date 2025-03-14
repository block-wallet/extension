#!/usr/bin/env node

/**
 * Ledger Connection Test Script
 * 
 * This script tests connectivity with Ledger hardware wallets
 * Run with: npm test
 */

const Transport = require('@ledgerhq/hw-transport-node-hid').default;
const Eth = require('@ledgerhq/hw-app-eth').default;
const { listen } = require('@ledgerhq/logs');

// Set this to true to see detailed logs
const VERBOSE = true;

// Configure derivation path (Ledger Live default)
const DERIVATION_PATH = "44'/60'/0'/0/0";

// Enable logging if verbose mode is on
if (VERBOSE) {
    listen(log => {
        console.log(`[${log.type}] ${log.message}`);
    });
}

/**
 * Tests basic Ledger connection and retrieves the first Ethereum address
 */
async function testLedgerConnection() {
    console.log('🔍 Searching for Ledger devices...');

    try {
        // Open connection to device
        const transport = await Transport.create();
        console.log('✅ Ledger device connected!');

        // Display transport info
        console.log('\n📊 Connection Details:');
        console.log(`  • Descriptor: ${transport.deviceModel?.id || 'Unknown'}`);
        console.log(`  • Version: ${JSON.stringify(transport.version) || 'Unknown'}`);

        // Initialize Ethereum app
        const eth = new Eth(transport);

        console.log('\n🔐 Testing Ethereum App...');
        console.log('  → Please open the Ethereum app on your Ledger device');

        // Get Ethereum app configuration
        const config = await eth.getAppConfiguration();
        console.log(`  ✓ Ethereum App version: ${config.version}`);

        // Get Ethereum address
        console.log('\n🔑 Retrieving Ethereum address...');
        console.log(`  → Using derivation path: m/${DERIVATION_PATH}`);
        const result = await eth.getAddress(DERIVATION_PATH);

        console.log('\n🎉 Success! Ethereum address retrieved:');
        console.log(`  • Address: ${result.address}`);
        console.log(`  • Path: m/${DERIVATION_PATH}`);

        // Close connection
        await transport.close();
        console.log('\n👋 Connection closed successfully');

        return true;
    } catch (error) {
        console.error('\n❌ Error connecting to Ledger device:');

        if (error.statusCode === 0x6e00) {
            console.error('  → The Ethereum app is not open. Please open it on your device.');
        } else if (error.statusCode === 0x6b0c) {
            console.error('  → Your Ledger device is locked. Please unlock it.');
        } else if (error.message && error.message.includes('cannot open device')) {
            console.error('  → Device not found or already in use by another application.');
        } else {
            console.error(`  → ${error.message || error}`);
        }

        console.log('\n📋 Troubleshooting steps:');
        console.log('  1. Make sure your Ledger is connected and unlocked');
        console.log('  2. Open the Ethereum application on your device');
        console.log('  3. Check that no other application is using the Ledger');
        console.log('  4. Try disconnecting and reconnecting the device');

        return false;
    }
}

/**
 * Test transaction signing (without sending anything)
 */
async function testTransactionSigning(eth, address) {
    console.log('\n📝 Testing transaction signing...');
    console.log('  → This will NOT send any actual transaction');

    try {
        // Create a dummy transaction
        const unsignedTx = {
            nonce: "0x00",
            gasPrice: "0x09184e72a000",
            gasLimit: "0x2710",
            to: "0x0000000000000000000000000000000000000000",
            value: "0x00",
            data: "0x",
            chainId: 1 // Mainnet
        };

        console.log('  → Please review and confirm the test transaction on your Ledger');

        // Sign transaction
        const signed = await eth.signTransaction(DERIVATION_PATH,
            Buffer.from(
                Object.values(unsignedTx)
                    .map(val => typeof val === 'string' ? val.slice(2) : val.toString(16))
                    .join('')
            ).toString('hex')
        );

        console.log('  ✓ Transaction signing successful!');
        console.log(`  • Signature r: ${signed.r}`);
        console.log(`  • Signature s: ${signed.s}`);
        console.log(`  • Signature v: ${signed.v}`);

        return true;
    } catch (error) {
        console.error('  ❌ Transaction signing failed:');

        if (error.statusCode === 0x6985) {
            console.error('  → Transaction was rejected on the device');
        } else if (error.statusCode === 0x6a80) {
            console.error('  → Invalid data was provided to the device');
        } else {
            console.error(`  → ${error.message || error}`);
        }

        return false;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('==================================');
    console.log('🧪 LEDGER CONNECTION TEST');
    console.log('==================================\n');

    const connected = await testLedgerConnection();

    if (connected) {
        console.log('\n✅ Basic connection test PASSED');
    } else {
        console.log('\n❌ Basic connection test FAILED');
        process.exit(1);
    }
}

// Run the main function
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
}); 