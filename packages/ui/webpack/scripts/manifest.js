

const fs = require('fs-extra');
const path = require('path');

const appDirectory = fs.realpathSync(process.cwd());
const resolvePath = relativePath => path.resolve(appDirectory, relativePath);
const paths = {
    dist: resolvePath('../../dist'),
    distFirefox: resolvePath('../../dist-firefox'),
    uiModules: resolvePath('node_modules'),
    scripts: resolvePath('../../scripts'),
    manifests: resolvePath('../../manifest')
}



const argv = process.argv.slice(2)

const browser = argv[0] ?? 'chrome'

const dist = browser === 'chrome' ? paths.dist : paths.distFirefox

// browser-polyfill must be always copied to output folder
copyScript(paths.uiModules + "/webextension-polyfill/dist/browser-polyfill.min.js");


// base manifest. contains general properties.
const baseManifest = JSON.parse(fs.readFileSync(paths.manifests + "/base.json", 'utf8'));

// browser specific manifest.
const browserManifest = JSON.parse(fs.readFileSync(paths.manifests + `/${browser}.json`, 'utf8'));

// merge base with browser specific
const manifest = { ...baseManifest, ...browserManifest }

// save output manifest.

fs.writeFileSync(dist + '/manifest.json', JSON.stringify(manifest, null, 2));


// if the browser is chrome, we additionaly copy the hot reload script.
if (browser === 'chrome') {
    copyScript(paths.scripts + '/hot-reload.js')
}


function copyScript(scriptPath) {
    fs.copySync(scriptPath, dist + "/" + path.basename(scriptPath))
}