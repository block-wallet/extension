import BlankProvider from '../provider/BlankProvider';
import { InjectedWindow } from '../types';
import log from 'loglevel';

/**
 * If no existing window.web3 is found, this function injects a web3 "shim" to
 * not break dapps that rely on window.web3.currentProvider.
 *
 * @param provider - The provider to set as window.web3.currentProvider.
 */
const shimWeb3 = (provider: BlankProvider): void => {
    let loggedCurrentProvider = false;
    let loggedMissingProperty = false;

    if (!(window as Window & InjectedWindow).web3) {
        const SHIM_IDENTIFIER = 'isBlockWalletShim__';

        let web3Shim = { currentProvider: provider };

        Object.defineProperty(web3Shim, SHIM_IDENTIFIER, {
            value: true,
            enumerable: true,
            configurable: false,
            writable: false,
        });

        web3Shim = new Proxy(web3Shim, {
            get: (target, property, ...args) => {
                if (property === 'currentProvider' && !loggedCurrentProvider) {
                    loggedCurrentProvider = true;
                    log.warn(
                        'You are accessing the BlockWallet window.web3.currentProvider shim. This property is deprecated; use window.ethereum instead.'
                    );
                } else if (
                    property !== 'currentProvider' &&
                    property !== SHIM_IDENTIFIER &&
                    !loggedMissingProperty
                ) {
                    loggedMissingProperty = true;
                    log.error('Web3 is not injected');
                }
                return Reflect.get(target, property, ...args);
            },
            set: (...args) => {
                log.warn(
                    'You are accessing the BlockWallet window.web3 shim. This object is deprecated; use window.ethereum instead.'
                );
                return Reflect.set(...args);
            },
        });

        Object.defineProperty(window, 'web3', {
            value: web3Shim,
            enumerable: false,
            configurable: true,
            writable: true,
        });
    }
};

export default shimWeb3;
