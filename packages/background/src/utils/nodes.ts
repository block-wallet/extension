const BLOCK_WALLET_DOMAIN = '.blockwallet.io';

export const isABlockWalletNode = (rpcUrl: string): boolean => {
    return rpcUrl.endsWith(BLOCK_WALLET_DOMAIN);
};

export const customHeadersForBlockWalletNode = { wallet: 'BlockWallet' };
