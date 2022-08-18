import { memoize } from 'lodash';
import { CHAIN_LIST, ChainListItem } from '@block-wallet/chains-assets';

export { ChainListItem }; // to be used for the ui.

export const getChainListItem = memoize((chainId: number) => {
    return CHAIN_LIST.find(
        (c: ChainListItem) => Number(c.chainId) === Number(chainId)
    );
});

export const searchChainsByTerm = memoize((term: string) => {
    return CHAIN_LIST.filter(
        (c: ChainListItem) =>
            c.name.match(new RegExp(term, 'i')) ||
            Number(c.chainId) === Number(term)
    );
});
