import { BigNumber, ethers } from 'ethers';
import NetworkController from '../../NetworkController';
import erc20Abi from '../abi';
import {
    accountParamNotPresentError,
    ownerParamNotPresentError,
    spenderParamNotPresentError,
    tokenAddressParamNotPresentError,
    tokenAddressInvalidError,
} from '../TokenController';
import { Token } from '../Token';
import { Interface } from 'ethers/lib/utils';
import log from 'loglevel';

export interface TokenTransactionProps {
    networkController: NetworkController;
}

export class TokenTransactionController {
    protected readonly _networkController: NetworkController;
    protected static _erc20Interface: Interface = new Interface(erc20Abi);

    constructor(props: TokenTransactionProps) {
        this._networkController = props.networkController;
    }
    /**
     * Generates a new instance of the contract for a token address
     * @param {string} tokenAddress
     * @returns ethers.Contract
     */
    protected getContract(
        tokenAddress: string,
        provider: ethers.providers.StaticJsonRpcProvider = this._networkController.getProvider()
    ): ethers.Contract {
        if (!tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }
        return new ethers.Contract(tokenAddress, erc20Abi, provider);
    }
}

export type TokenOperationsControllerProps = TokenTransactionProps;

export class TokenOperationsController extends TokenTransactionController {
    constructor(props: TokenOperationsControllerProps) {
        super(props);
    }

    /**
     * Get the balance of a token for a wallet
     * @param {string} tokenAddress to get balance
     * @param {string} account wallet to get balance
     */
    public async balanceOf(
        tokenAddress: string,
        account: string,
        provider: ethers.providers.StaticJsonRpcProvider = this._networkController.getProvider()
    ): Promise<BigNumber> {
        if (!tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }
        if (!account) {
            throw accountParamNotPresentError;
        }
        const contract = this.getContract(tokenAddress, provider);
        return contract.balanceOf(account);
    }

    /**
     * Get the allowance amount
     * @param {string} tokenAddress to chek
     * @param {string} owner wallet owner of the tokens
     * @param {string} spender who wants to spend some tokens
     */
    public async allowance(
        tokenAddress: string,
        owner: string,
        spender: string
    ): Promise<BigNumber> {
        if (!tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }
        if (!owner) {
            throw ownerParamNotPresentError;
        }
        if (!spender) {
            throw spenderParamNotPresentError;
        }
        const contract = this.getContract(tokenAddress);
        return contract.allowance(owner, spender);
    }
    /**
     * Search the token in the blockchain
     *
     * @param {string} tokenAddress erc20 token address
     */
    public async populateTokenData(tokenAddress: string): Promise<Token> {
        if (!tokenAddress) {
            throw tokenAddressParamNotPresentError;
        }

        let name = '';
        let symbol = '';
        let decimals = 0;

        try {
            const contract = this.getContract(tokenAddress);

            const namePromise = contract.name();
            const symbolPromise = contract.symbol();
            const decimalsPromise = contract.decimals();

            const results = await Promise.all([
                namePromise,
                symbolPromise,
                decimalsPromise,
            ]).catch((error) => {
                log.error(error);
                throw tokenAddressInvalidError;
            });

            name = results[0] as string;
            symbol = results[1] as string;
            decimals = parseFloat(results[2] as string);
        } catch (error) {
            log.error(error.message || error);
        }

        return new Token(tokenAddress, name, symbol, decimals);
    }
}
