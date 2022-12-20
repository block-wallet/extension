import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import {
    IAccountTokens,
    INetworkTokens,
    IToken,
    ITokens,
} from '../../../../controllers/erc-20/Token';
import NetworkController from '../../../../controllers/NetworkController';
import { TokenOperationsController } from '../../../../controllers/erc-20/transactions/Transaction';
import { Accounts } from '@block-wallet/background/controllers/AccountTrackerController';
import { toChecksumAddress } from 'ethereumjs-util';

const hasRecords = (records: Record<any, any>): boolean => {
    return records && Object.keys(records).length > 0;
};

const isValidToken = (token: IToken): boolean => {
    return token && !!token.symbol && token.decimals > -1;
};

/**
 * This migration fixes the token decimals
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const networkControllerInstance = new NetworkController(
            persistedState.NetworkController
        );
        const tokenOperationsController = new TokenOperationsController({
            networkController: networkControllerInstance,
        });
        const fetchedTokens: Record<number, ITokens> = {};

        const { cachedPopulatedTokens, deletedUserTokens, userTokens } =
            persistedState.TokenController;

        const { bridgeReceivingTransactions } = persistedState.BridgeController;

        function _updateCache(newToken: IToken, chainId: number) {
            if (!fetchedTokens[chainId]) {
                fetchedTokens[chainId] = {};
            }
            fetchedTokens[chainId][toChecksumAddress(newToken.address)] =
                newToken;
        }

        async function regenerateTokenData(
            token: IToken,
            chainId: number
        ): Promise<IToken | undefined> {
            if (isValidToken(token)) {
                _updateCache(token, chainId);
                return token;
            }

            //token data is invalid
            const alreadyFetchedToken = (fetchedTokens[chainId] || {})[
                toChecksumAddress(token.address)
            ];
            if (alreadyFetchedToken) {
                return alreadyFetchedToken;
            }

            //refetch token data
            const { token: fetchedToken } =
                await tokenOperationsController.fetchTokenDataFromChain(
                    token.address,
                    chainId
                );

            if (fetchedToken && isValidToken(fetchedToken)) {
                _updateCache(fetchedToken, chainId);
                return fetchedToken;
            }

            return undefined;
        }

        async function fixTokenInfo(
            tokens: ITokens,
            chainId: number
        ): Promise<ITokens> {
            const tokensRet = { ...tokens };
            for (const address in tokens) {
                const token = tokens[address];
                if (token) {
                    const regeneratedToken = await regenerateTokenData(
                        token,
                        chainId
                    );
                    if (!regeneratedToken) {
                        //delete token if we weren't able to regenerate it successfully
                        delete tokensRet[address];
                    } else {
                        tokensRet[address] = regeneratedToken;
                    }
                }
            }
            return tokensRet;
        }

        async function fixNetworkTokens(
            networkTokens: INetworkTokens
        ): Promise<INetworkTokens> {
            const networkTokensRet = { ...networkTokens };
            for (const chainIdStr in networkTokens) {
                const chainId = Number(chainIdStr);
                const currentNetworkTokens = networkTokens[chainId];
                if (hasRecords(currentNetworkTokens)) {
                    networkTokensRet[chainId] = await fixTokenInfo(
                        currentNetworkTokens,
                        chainId
                    );
                }
            }
            return networkTokensRet;
        }

        async function fixAccountTokens(
            accountTokens: IAccountTokens
        ): Promise<IAccountTokens> {
            const accountTokenRet = { ...accountTokens };
            for (const account in accountTokens) {
                const currentAccountTokens = accountTokens[account];
                if (hasRecords(currentAccountTokens)) {
                    accountTokenRet[account] = await fixNetworkTokens(
                        currentAccountTokens
                    );
                }
            }
            return accountTokenRet;
        }

        /**
         * TOKEN FIXES
         */

        const fixedCachedPopulatedTokens = await fixNetworkTokens(
            cachedPopulatedTokens
        );
        const fixedDeletedUserTokens = await fixAccountTokens(
            deletedUserTokens
        );
        const fixedUserTokens = await fixAccountTokens(userTokens);

        /**
         * BRIDGES FIXES
         */

        async function fixBridgeTransactions(): Promise<
            typeof bridgeReceivingTransactions
        > {
            const fixedTxs = { ...bridgeReceivingTransactions };
            for (const chainIdStr in bridgeReceivingTransactions) {
                const chainId = Number(chainIdStr);
                const chainBridgeTx = bridgeReceivingTransactions[chainId];
                if (hasRecords(chainBridgeTx)) {
                    for (const account in chainBridgeTx) {
                        const accountBridgeTxs = chainBridgeTx[account];
                        if (hasRecords(accountBridgeTxs)) {
                            for (const hash in accountBridgeTxs) {
                                const bridgeTx = accountBridgeTxs[hash];
                                if (bridgeTx && bridgeTx.transferType) {
                                    const toToken =
                                        bridgeTx.bridgeParams
                                            ?.effectiveToToken ||
                                        bridgeTx.bridgeParams?.toToken;
                                    let realDecimals = 18;
                                    if (toToken) {
                                        const bridgedToken =
                                            await regenerateTokenData(
                                                {
                                                    address: toToken.address,
                                                    symbol: bridgeTx
                                                        .transferType.currency,
                                                    decimals:
                                                        bridgeTx.transferType
                                                            .decimals,
                                                } as IToken,
                                                chainId
                                            );
                                        realDecimals =
                                            bridgedToken &&
                                            bridgedToken.decimals > 0
                                                ? bridgedToken.decimals
                                                : 18;
                                    }

                                    const currentTx =
                                        fixedTxs[chainId][account][hash];

                                    fixedTxs[chainId][account][hash] = {
                                        ...currentTx,
                                        transferType: {
                                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                            ...currentTx.transferType!,
                                            decimals: realDecimals,
                                        },
                                    };
                                }
                            }
                        }
                    }
                }
            }

            return fixedTxs;
        }
        const fixedBridgeReceivingTransactions = await fixBridgeTransactions();

        /**
         * ACCOUNT TRACKER FIXES
         */

        async function fixAccountBalances(
            accounts: Accounts
        ): Promise<Accounts> {
            const fixedAccounts = { ...accounts };
            for (const accountAddress in fixedAccounts) {
                const currentAccount = fixedAccounts[accountAddress];
                if (currentAccount) {
                    const fixedAccountBalances = { ...currentAccount.balances };
                    for (const chainIdStr in fixedAccountBalances) {
                        const chainId = Number(chainIdStr);
                        const chainAccountTokenBalances =
                            fixedAccountBalances[chainId];
                        for (const tokenAddress in chainAccountTokenBalances.tokens ||
                            {}) {
                            const tokenWithBalance =
                                chainAccountTokenBalances.tokens[tokenAddress];
                            if (tokenWithBalance && tokenWithBalance.token) {
                                const fixedTokenData =
                                    (await regenerateTokenData(
                                        tokenWithBalance.token,
                                        chainId
                                    )) || { decimals: 18 };
                                fixedAccountBalances[chainId] = {
                                    ...fixedAccountBalances[chainId],
                                    tokens: {
                                        ...fixedAccountBalances[chainId].tokens,
                                        [tokenAddress]: {
                                            ...tokenWithBalance,
                                            token: {
                                                ...tokenWithBalance.token,
                                                ...fixedTokenData,
                                            },
                                        },
                                    },
                                };
                            }
                        }
                    }
                    fixedAccounts[accountAddress] = {
                        ...currentAccount,
                        balances: fixedAccountBalances,
                    };
                }
            }
            return fixedAccounts;
        }

        const fixedAccouts = await fixAccountBalances(
            persistedState.AccountTrackerController.accounts
        );
        const fixedHiddenAccouts = await fixAccountBalances(
            persistedState.AccountTrackerController.hiddenAccounts
        );

        return {
            ...persistedState,
            TokenController: {
                cachedPopulatedTokens: fixedCachedPopulatedTokens,
                deletedUserTokens: fixedDeletedUserTokens,
                userTokens: fixedUserTokens,
            },
            BridgeController: {
                ...persistedState.BridgeController,
                bridgeReceivingTransactions: fixedBridgeReceivingTransactions,
            },
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                accounts: fixedAccouts,
                hiddenAccounts: fixedHiddenAccouts,
            },
        };
    },
    version: '0.8.6',
} as IMigration;
