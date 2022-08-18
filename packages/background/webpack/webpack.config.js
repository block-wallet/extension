const createConfig = require('./webpack.shared.js');

module.exports = createConfig({
    background: './src/index.ts',
    'vendor/trezor/trezor-content':
        './src/infrastructure/hardware/trezor/trezor-content.ts',
    'vendor/trezor/trezor-usb-permissions':
        './src/infrastructure/hardware/trezor/trezor-usb-permissions.ts',
});
