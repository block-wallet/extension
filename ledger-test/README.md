# Ledger Connection Test

A standalone script to test Ledger hardware wallet connectivity for Ethereum applications.

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Ledger device (Nano S, Nano X, or Nano S Plus)
- Ledger device must have the Ethereum app installed

## Installation

```bash
# Install dependencies
npm install
```

## Usage

1. Connect your Ledger device to your computer via USB
2. Unlock your Ledger device
3. Open the Ethereum application on your Ledger
4. Run the test:

```bash
npm test
```

## What this test checks

1. Device connectivity via HID protocol
2. Ability to retrieve Ethereum app version
3. Ability to derive and retrieve Ethereum addresses
4. Basic transaction signing (without broadcasting)

## Troubleshooting

### Common issues

1. **"Cannot open device" error**
   - Make sure no other application is using your Ledger (Chrome, Ledger Live)
   - Try disconnecting and reconnecting your device

2. **Permission errors on Linux**
   - You may need to add udev rules. See [Ledger's documentation](https://support.ledger.com/hc/en-us/articles/115005165269-Fix-connection-issues)

3. **Transport error**
   - Make sure the Ethereum app is open on your Ledger
   - Make sure your Ledger is unlocked
   - Try using a different USB cable or port

### Specific error codes

- `0x6e00`: Ethereum app is not open on the device
- `0x6b0c`: Ledger device is locked
- `0x6985`: Transaction was rejected on the device
- `0x6a80`: Invalid data was provided to the device

## Testing your extension

If this standalone test succeeds but your extension fails to connect, the issue is likely in your extension's implementation rather than with the Ledger device itself.

## License

MIT
