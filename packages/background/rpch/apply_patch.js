/**
 * This is a total hack, sorry.
 * Better fix coming later.
 */
const fs = require('fs');
const path = require('path');
const DIST_DIR = path.join(__dirname, '..', '..', '..', 'dist');

function patchBackgroundJs() {
    console.log('[RPCh] Applying patch for background.js');
    const filePath = path.join(DIST_DIR, 'background.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = content.replace(
        'var ctx = __self__;',
        'var ctx = global.fetch ? global : __self__;'
    );
    fs.writeFileSync(filePath, updatedContent);
}

function patchWasm() {
    console.log('[RPCh] Applying patch for rpch_crypto_bg.wasm');
    const fileName = 'rpch_crypto_bg.wasm';
    fs.copyFileSync(
        path.join(__dirname, fileName),
        path.join(DIST_DIR, fileName)
    );
}

patchBackgroundJs();
patchWasm();
