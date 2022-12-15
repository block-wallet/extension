import {
    FetchTokenResponse,
    IAccountTokens,
    INetworkTokens,
    IToken,
    ITokens,
    SearchTokensResponse,
    Token,
} from './Token';
import { BaseController } from '../../infrastructure/BaseController';
import NetworkController from '../NetworkController';
import NETWORK_TOKENS_LIST, {
    getBlankTokenDataByChainId,
    NETWORK_TOKENS_LIST_ARRAY,
} from './TokenList';
import {
    isHexPrefixed,
    isValidAddress,
    toChecksumAddress,
} from 'ethereumjs-util';
import { PreferencesController } from '../PreferencesController';
import { Mutex } from 'async-mutex';
import initialState from '../../utils/constants/initialState';
import { TokenOperationsController } from './transactions/Transaction';
import { fillTokenData } from '../../utils/token';

const tokenAddressParamNotPresentError = new Error('token address is required');
const tokenAddressInvalidError = new Error(
    'token address is invalid for selected network'
);
const tokenParamNotPresentError = new Error('token is required');
const fromParamNotPresentError = new Error('from is required');
const toParamNotPresentError = new Error('to is required');
const amountParamNotPresentError = new Error('amount is required');
const gasPriceParamNotPresentError = new Error('gas price is required');
const gasLimitParamNotPresentError = new Error('gas limit is required');
const gasMaxFeePerGasParamNotPresentError = new Error(
    'max fee per gas is required'
);
const gasMaxPriorityFeePerGasParamNotPresentError = new Error(
    'max priority fee per gas is required'
);
const ownerParamNotPresentError = new Error('owner is required');
const spenderParamNotPresentError = new Error('spender is required');
const accountParamNotPresentError = new Error('account is required');
const searchParamNotPresentError = new Error('search is required');
const populatedTransactionParamNotPresentError = new Error(
    'populatedTransaction is required'
);
const transactionMetaParamNotPresentError = new Error(
    'transactionMeta is required'
);
const transactionIdParamNotPresentError = new Error(
    'transactionId is required'
);
const transactionNotFound = new Error('transaction not found');
export {
    tokenAddressParamNotPresentError,
    tokenAddressInvalidError,
    tokenParamNotPresentError,
    fromParamNotPresentError,
    toParamNotPresentError,
    amountParamNotPresentError,
    gasPriceParamNotPresentError,
    gasLimitParamNotPresentError,
    gasMaxFeePerGasParamNotPresentError,
    gasMaxPriorityFeePerGasParamNotPresentError,
    ownerParamNotPresentError,
    spenderParamNotPresentError,
    accountParamNotPresentError,
    searchParamNotPresentError,
    populatedTransactionParamNotPresentError,
    transactionMetaParamNotPresentError,
    transactionIdParamNotPresentError,
    transactionNotFound,
};

export interface TokenControllerState {
    userTokens: IAccountTokens;
    deletedUserTokens: IAccountTokens;
    cachedPopulatedTokens: INetworkTokens;
}

export interface TokenControllerProps {
    preferencesController: PreferencesController;
    networkController: NetworkController;
    tokenOperationsController: TokenOperationsController;
}

export enum TokenControllerEvents {
    USER_TOKEN_CHANGE = 'USER_TOKEN_CHANGE',
}

export const NATIVE_TOKEN_ADDRESS =
    '0x0000000000000000000000000000000000000000';

export class TokenController extends BaseController<TokenControllerState> {
    private readonly _mutex: Mutex;
    private readonly _preferencesController: PreferencesController;
    private readonly _networkController: NetworkController;
    private readonly _tokenOperationsController: TokenOperationsController;

    constructor(initState: TokenControllerState, props: TokenControllerProps) {
        super(initState || { userTokens: {}, deletedUserTokens: {} });

        this._mutex = new Mutex();
        this._preferencesController = props.preferencesController;
        this._networkController = props.networkController;
        this._tokenOperationsController = props.tokenOperationsController;
    }

    /**
     * It sets the $BLANK token to visible by default
     */
    public async setBlankToken(
        accountAddress?: string,
        chainId: number = this.getSelectedNetworkChainId()
    ): Promise<void> {
        const goBlankToken = getBlankTokenDataByChainId(chainId);
        if (goBlankToken) {
            const userTokensAddresses =
                await this.getUserTokenContractAddresses(
                    accountAddress,
                    chainId
                );
            const userDeletedTokenAddresses =
                await this.getDeletedUserTokenContractAddresses(
                    accountAddress,
                    chainId
                );

            goBlankToken.address = toChecksumAddress(goBlankToken.address);

            if (
                !userTokensAddresses.includes(goBlankToken.address) &&
                !userDeletedTokenAddresses.includes(goBlankToken.address)
            ) {
                return this.addCustomToken(
                    goBlankToken,
                    accountAddress,
                    chainId,
                    true
                );
            }
        }
    }
    /**
     * Delete a token to the user token list and add it to the removed token list
     * @param tokenAddress to be deleted
     */
    public async deleteUserToken(
        tokenAddress: string,
        accountAddress?: string,
        chainId?: number
    ): Promise<void> {
        if (!tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }

        tokenAddress = toChecksumAddress(tokenAddress);

        const token = await this.getToken(
            tokenAddress,
            accountAddress,
            chainId
        );

        if (token) {
            token.address = tokenAddress;
        }

        const userTokens = await this.getUserTokens(accountAddress, chainId);
        delete userTokens[tokenAddress];

        const deletedUserTokens = await this.getDeletedUserTokens(
            accountAddress,
            chainId
        );

        if (token) {
            deletedUserTokens[tokenAddress] = token;
        }

        const cachedPopulatedTokens = await this.getCachedPopulatedTokens(
            chainId
        );

        await this._updateState(
            userTokens,
            deletedUserTokens,
            cachedPopulatedTokens,
            accountAddress,
            chainId
        );
    }

    /**
     * Search a token by address, name or symbol
     *
     * @param search String to identify  the token.
     * @param exact For name or symbol search, if should be exact or included in the string. Default is false.
     * @param accountAddress Account's token list to be used, defaults to selected address.
     * @param chainId
     * @param isLocalSearch Limits the search to the local list, default is false.
     */
    public async search(
        search: string,
        exact = false,
        accountAddress?: string,
        chainId?: number,
        isLocalSearch = false
    ): Promise<SearchTokensResponse> {
        if (!search) {
            throw searchParamNotPresentError;
        }

        // if it's searching for an address or a specific token
        if (isHexPrefixed(search)) {
            const token = await this.getToken(search, accountAddress, chainId);

            // token is cached
            if (token) return { tokens: [token], fetchFailed: false };

            if (!isLocalSearch) {
                const tokenResponse = await this._populateTokenData(
                    search,
                    accountAddress,
                    chainId
                );

                // return the token with the failed flag
                return {
                    tokens: [tokenResponse.token],
                    fetchFailed: tokenResponse.fetchFailed,
                };
            }

            return { tokens: [], fetchFailed: false };
        }

        const tokensList = Object.values(await this.getTokens(chainId));
        search = search.toUpperCase();

        const tokens = tokensList.filter((token) => {
            const name = token.name.toUpperCase();
            const symbol = token.symbol.toUpperCase();
            return exact
                ? name === search || symbol === search
                : name.includes(search) || symbol.includes(search);
        });

        return { tokens, fetchFailed: false };
    }

    /**
     * Get a token searching by address
     * @param address address of the token
     */
    public async getToken(
        address: string,
        accountAddress?: string,
        chainId?: number
    ): Promise<Token> {
        if (!address) {
            throw tokenAddressParamNotPresentError;
        }

        address = toChecksumAddress(address);

        const token = (await this.getUserTokens(accountAddress, chainId))[
            address
        ];
        if (token) {
            return token;
        }

        return (await this.getTokens(chainId))[address];
    }

    /**
     * Add a custom token to the list of available tokens
     * @param token to be added
     */
    public async addCustomToken(
        token: Token,
        accountAddress?: string,
        chainId?: number,
        ignoreEvent?: boolean
    ): Promise<void> {
        if (!token) {
            throw tokenParamNotPresentError;
        }
        return this.addCustomTokens(
            [token],
            accountAddress,
            chainId,
            ignoreEvent
        );
    }

    /**
     * Add custom tokens to the list of available tokens
     * @param tokens to be added
     */
    public async addCustomTokens(
        tokens: Token[],
        accountAddress?: string,
        chainId?: number,
        ignoreEvent?: boolean
    ): Promise<void> {
        return this._addTokenToUserTokens(
            tokens,
            accountAddress,
            chainId,
            ignoreEvent
        );
    }

    /**
     * Add tokens to the user tokens list and remove them from the deleted user tokens list
     * @param tokens to be added
     */
    private async _addTokenToUserTokens(
        tokens: Token[],
        accountAddress?: string,
        chainId?: number,
        ignoreEvent?: boolean
    ) {
        if (!tokens || tokens.length <= 0) {
            throw tokenParamNotPresentError;
        }

        const userTokens = await this.getUserTokens(accountAddress, chainId);
        const deletedUserTokens = await this.getDeletedUserTokens(
            accountAddress,
            chainId
        );

        const cleanedTokens = tokens.map((token) => {
            if (!token.name) {
                return {
                    ...token,
                    name: token.symbol,
                };
            }
            return token;
        });

        for (let i = 0; i < cleanedTokens.length; i++) {
            cleanedTokens[i].address = toChecksumAddress(
                cleanedTokens[i].address
            );

            userTokens[cleanedTokens[i].address] = cleanedTokens[i];
            delete deletedUserTokens[cleanedTokens[i].address];
        }

        const cachedPopulatedTokens = await this.getCachedPopulatedTokens(
            chainId
        );

        await this._updateState(
            userTokens,
            deletedUserTokens,
            cachedPopulatedTokens,
            accountAddress,
            chainId,
            ignoreEvent
        );

        this.emit(
            TokenControllerEvents.USER_TOKEN_CHANGE,
            this.getSelectedAccountAddress(),
            this.getSelectedNetworkChainId(),
            tokens.map(function (token) {
                return token.address;
            })
        );
    }

    /**
     * It returns the address of all the contracts
     */
    public async getContractAddresses(
        chainId: number = this._networkController.network.chainId
    ): Promise<string[]> {
        return NETWORK_TOKENS_LIST_ARRAY[chainId] || [];
    }

    /**
     * It returns the address of the contracts that the user adds
     */
    public async getUserTokenContractAddresses(
        accountAddress?: string,
        chainId?: number
    ): Promise<string[]> {
        return Object.keys(await this.getUserTokens(accountAddress, chainId));
    }

    /**
     * It returns the address of the contracts that the user deletes
     */
    public async getDeletedUserTokenContractAddresses(
        accountAddress?: string,
        chainId?: number
    ): Promise<string[]> {
        return Object.keys(
            await this.getDeletedUserTokens(accountAddress, chainId)
        );
    }

    /**
     * It returns the tokens that the user add
     */
    public async getUserTokens(
        accountAddress: string = this.getSelectedAccountAddress(),
        chainId: number = this.getSelectedNetworkChainId()
    ): Promise<ITokens> {
        const tokens = this.store.getState();
        if (accountAddress in tokens.userTokens) {
            if (chainId in tokens.userTokens[accountAddress]) {
                return tokens.userTokens[accountAddress][chainId];
            }
        }
        return {} as ITokens;
    }

    /**
     * It returns the tokens that were cached after populate
     */
    public async getCachedPopulatedTokens(
        chainId: number = this.getSelectedNetworkChainId()
    ): Promise<ITokens> {
        const { cachedPopulatedTokens } = this.store.getState();
        if (chainId in cachedPopulatedTokens) {
            return cachedPopulatedTokens[chainId];
        }
        return {} as ITokens;
    }

    /**
     * It returns the tokens that the user delete
     */
    public async getDeletedUserTokens(
        accountAddress: string = this.getSelectedAccountAddress(),
        chainId: number = this.getSelectedNetworkChainId()
    ): Promise<ITokens> {
        const tokens = this.store.getState();
        if (accountAddress in tokens.deletedUserTokens) {
            if (chainId in tokens.deletedUserTokens[accountAddress]) {
                return tokens.deletedUserTokens[accountAddress][chainId];
            }
        }
        return {} as ITokens;
    }

    /**
     * Populates a token and caches it.
     * @param tokenAddress
     * @param accountAddress
     * @param chainId
     * @returns
     */
    private async _populateTokenData(
        tokenAddress: string,
        accountAddress?: string,
        chainId?: number
    ): Promise<FetchTokenResponse> {
        tokenAddress = toChecksumAddress(tokenAddress);

        // Check cached tokens
        const token = (await this.getCachedPopulatedTokens(chainId))[
            tokenAddress
        ];
        if (token) {
            return { token, fetchFailed: false };
        }

        // Tries to fetch token data from chain
        const fetchTokenResponse =
            await this._tokenOperationsController.fetchTokenDataFromChain(
                tokenAddress,
                chainId
            );

        // Cache the token data if the token data is all fetched correctly.
        if (
            fetchTokenResponse.token &&
            fetchTokenResponse.token.name &&
            fetchTokenResponse.token.symbol &&
            !fetchTokenResponse.fetchFailed
        ) {
            const userTokens = await this.getUserTokens(
                accountAddress,
                chainId
            );
            const deletedUserTokens = await this.getDeletedUserTokens(
                accountAddress,
                chainId
            );

            const cachedPopulatedTokens = await this.getCachedPopulatedTokens(
                chainId
            );
            cachedPopulatedTokens[tokenAddress] = fetchTokenResponse.token;

            await this._updateState(
                userTokens,
                deletedUserTokens,
                cachedPopulatedTokens,
                accountAddress,
                chainId,
                true
            );
        }

        return fetchTokenResponse;
    }

    private async _updateState(
        userTokens: ITokens,
        deletedUserTokens: ITokens,
        cachedPopulatedTokens: ITokens,
        accountAddress: string = this.getSelectedAccountAddress(),
        chainId: number = this.getSelectedNetworkChainId(),
        ignoreEvent = false
    ) {
        const releaseLock = await this._mutex.acquire();

        try {
            // Get current token objects
            const _userTokens = {
                ...this.store.getState().userTokens,
            };
            const _deletedUserTokens = {
                ...this.store.getState().deletedUserTokens,
            };
            const _cachedPopulatedTokens = {
                ...this.store.getState().cachedPopulatedTokens,
            };

            // Avoiding undefined
            if (!(accountAddress in _userTokens)) {
                _userTokens[accountAddress] = {};
            }
            if (!(chainId in _userTokens[accountAddress])) {
                _userTokens[accountAddress][chainId] = {};
            }

            if (!(accountAddress in _deletedUserTokens)) {
                _deletedUserTokens[accountAddress] = {};
            }
            if (!(chainId in _deletedUserTokens[accountAddress])) {
                _deletedUserTokens[accountAddress][chainId] = {};
            }

            if (!(chainId in _cachedPopulatedTokens)) {
                _cachedPopulatedTokens[chainId] = {};
            }

            // checksum addresses
            const _normalizedUserTokens: ITokens = {};
            const _normalizedDeletedUserTokens: ITokens = {};
            const _normalizedCachedPopulatedTokens: ITokens = {};

            for (const tokenAddress in userTokens) {
                const token = userTokens[tokenAddress];
                if (isValidAddress(token.address)) {
                    token.address = toChecksumAddress(token.address);
                }
                _normalizedUserTokens[token.address] = token;
            }
            for (const tokenAddress in deletedUserTokens) {
                const token = deletedUserTokens[tokenAddress];
                if (isValidAddress(token.address)) {
                    token.address = toChecksumAddress(token.address);
                }
                _normalizedDeletedUserTokens[token.address] = token;
            }
            for (const tokenAddress in cachedPopulatedTokens) {
                const token = cachedPopulatedTokens[tokenAddress];
                if (isValidAddress(token.address)) {
                    token.address = toChecksumAddress(token.address);
                }
                _normalizedCachedPopulatedTokens[token.address] = token;
            }

            // Set new ref
            _userTokens[accountAddress][chainId] = _normalizedUserTokens;
            _deletedUserTokens[accountAddress][chainId] =
                _normalizedDeletedUserTokens;
            _cachedPopulatedTokens[chainId] = _normalizedCachedPopulatedTokens;

            // Update store and emit event
            this.store.updateState({
                userTokens: _userTokens,
                deletedUserTokens: _deletedUserTokens,
                cachedPopulatedTokens: _cachedPopulatedTokens,
            });

            // Event
            if (!ignoreEvent) {
                this.emit(
                    TokenControllerEvents.USER_TOKEN_CHANGE,
                    accountAddress,
                    chainId
                );
            }
        } finally {
            releaseLock();
        }
    }

    /**
     * Returns the selected account address
     * @returns string
     */
    private getSelectedAccountAddress(): string {
        return toChecksumAddress(
            this._preferencesController.getSelectedAddress()
        );
    }
    /**
     * Returns the selected network chain id
     * @returns number
     */
    private getSelectedNetworkChainId(): number {
        return this._networkController.network.chainId;
    }

    /**
     * It returns all the available tokens
     */
    public async getTokens(
        chainId: number = this._networkController.network.chainId
    ): Promise<ITokens> {
        return NETWORK_TOKENS_LIST[chainId] || ({} as ITokens);
    }

    /**
     * Removes all activities from state
     *
     */
    public clearTokens(): void {
        this.store.setState(initialState.TokenController);
    }

    /**
     * Attemps to add a token to the user's token list.
     */
    public attemptAddToken = async (
        tokenAddress: string,
        chainId?: number,
        //default data if the token is not found.
        defaultTokenData?: IToken
    ): Promise<void> => {
        const tokenExists = (
            await this.getUserTokens(this.getSelectedAccountAddress(), chainId)
        )[tokenAddress];

        //If the token already exists, then fire an event to update it's balance
        if (tokenExists) {
            this.emit(
                TokenControllerEvents.USER_TOKEN_CHANGE,
                this.getSelectedAccountAddress(),
                chainId || this.getSelectedNetworkChainId(),
                [tokenAddress]
            );
            return;
        }

        const fullToken = await this.search(
            tokenAddress,
            false,
            this.getSelectedAccountAddress(),
            chainId
        );

        if ((!fullToken || !fullToken.tokens.length) && !defaultTokenData) {
            return;
        }

        const token = fillTokenData(
            fullToken.tokens[0] as IToken,
            defaultTokenData
        );

        //If the token has no symbol, ensure that the user adds it manually.
        if (!token.symbol) {
            return;
        }

        return this.addCustomToken(
            token,
            this.getSelectedAccountAddress(),
            chainId,
            false
        );
    };
}
