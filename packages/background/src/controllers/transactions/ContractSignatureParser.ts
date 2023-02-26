import NetworkController from '../NetworkController';
import log from 'loglevel';
import { Contract } from '@ethersproject/contracts';
import { Interface, Fragment } from '@ethersproject/abi';
import { TransactionDescription } from '@ethersproject/abi';
import httpClient, { RequestError } from '../../utils/http';
import { sleep } from '../../utils/sleep';
import { MILISECOND } from '../../utils/constants/time';
import { retryHandling } from '../../utils/retryHandling';
import erc20Abi from '../erc-20/abi';

const MAX_REQUEST_RETRY = 20;
const API_CALLS_DELAY = 500 * MILISECOND;

const SIGNATURE_REGISTRY_CONTRACT = {
    address: '0x44691B39d1a75dC4E0A0346CBB15E310e6ED1E86',
    abi: [
        {
            constant: false,
            inputs: [{ name: '_new', type: 'address' }],
            name: 'setOwner',
            outputs: [],
            payable: false,
            type: 'function',
        },
        {
            constant: true,
            inputs: [],
            name: 'totalSignatures',
            outputs: [{ name: '', type: 'uint256' }],
            payable: false,
            type: 'function',
        },
        {
            constant: true,
            inputs: [],
            name: 'owner',
            outputs: [{ name: '', type: 'address' }],
            payable: false,
            type: 'function',
        },
        {
            constant: false,
            inputs: [],
            name: 'drain',
            outputs: [],
            payable: false,
            type: 'function',
        },
        {
            constant: true,
            inputs: [{ name: '', type: 'bytes4' }],
            name: 'entries',
            outputs: [{ name: '', type: 'string' }],
            payable: false,
            type: 'function',
        },
        {
            constant: false,
            inputs: [{ name: '_method', type: 'string' }],
            name: 'register',
            outputs: [{ name: '', type: 'bool' }],
            payable: false,
            type: 'function',
        },
        { inputs: [], type: 'constructor' },
        {
            anonymous: false,
            inputs: [
                { indexed: true, name: 'creator', type: 'address' },
                { indexed: true, name: 'signature', type: 'bytes4' },
                { indexed: false, name: 'method', type: 'string' },
            ],
            name: 'Registered',
            type: 'event',
        },
        {
            anonymous: false,
            inputs: [
                { indexed: true, name: 'old', type: 'address' },
                { indexed: true, name: 'current', type: 'address' },
            ],
            name: 'NewOwner',
            type: 'event',
        },
    ],
};

export type ContractMethodSignature = {
    name: string;
    args: TransactionArgument[];
};

export type TransactionArgument = {
    name?: string | null;
    type: string;
    // eslint-disable-next-line
    value: any;
};

export type FourByteResponseResult = {
    id: number;
    text_signature: string;
    bytes_signature: string;
    hex_signature: string;
};

type FourByteResponse = {
    count: number;
    results: FourByteResponseResult[];
};

/**
 * Class to fetch & parse method signature names from Etherscan API, 4bytes API or Signature Registry contract.
 */
export class ContractSignatureParser {
    private signatureRegistry: Contract;
    protected _erc20Interface: Interface = new Interface(erc20Abi);

    constructor(
        private readonly _networkController: NetworkController,
        private readonly customChainId?: number
    ) {
        this.signatureRegistry = new Contract(
            SIGNATURE_REGISTRY_CONTRACT.address,
            SIGNATURE_REGISTRY_CONTRACT.abi,
            this._networkController.getProviderFromName('mainnet')
        );
    }

    public getERC20MethodSignature(
        data: string
    ): ContractMethodSignature | undefined {
        try {
            const parsedTransaction = this._erc20Interface.parseTransaction({
                data,
            });

            if (parsedTransaction) {
                return this._parseTransactionDescription(parsedTransaction);
            }
        } catch (e) {
            log.warn('Error parsing transaction from contractABI');
        }
    }

    /**
     * Returns the contract method signature
     *
     * @param data Transaction data
     * @param contractAddress Contract address
     * @returns The method signature or undefined
     */
    public async getMethodSignature(
        data: string,
        contractAddress: string
    ): Promise<ContractMethodSignature | undefined> {
        let contractABI: string | undefined;
        try {
            // Try to fetch contract's ABI from Etherscan
            contractABI = await this._fetchABIFromEtherscan(contractAddress);
        } catch (e) {
            log.warn('getMethodSignature', 'fetchABIFromEtherscan', e);
        }

        //try to parse it using contract ABI
        if (contractABI) {
            try {
                const contractInterface = new Interface(contractABI);

                const parsedTransaction = contractInterface.parseTransaction({
                    data,
                });

                if (parsedTransaction) {
                    return this._parseTransactionDescription(parsedTransaction);
                }
            } catch (e) {
                log.warn('Error parsing transaction from contractABI');
            }
        }

        try {
            // If couldn't be fetched from Etherscan, fallback to 4bytes/Signature Registry contract
            const bytesSignature = data.slice(0, 10);

            // Lookup on signature registry contract
            const unparsedSignatures = await this._lookup(bytesSignature);

            if (unparsedSignatures && unparsedSignatures.length) {
                for (let n = 0; n < unparsedSignatures.length; n++) {
                    const parsed = this._parseFunctionFragment(
                        data,
                        unparsedSignatures[n]
                    );

                    if (parsed) {
                        return this._parseTransactionDescription(parsed);
                    }
                }
            }
        } catch (error) {
            log.warn(error);
        }
    }

    private _getEtherscanApiUrl(): string | undefined {
        const defaultNetwork = this._networkController.network;
        const network = this.customChainId
            ? this._networkController.getNetworkFromChainId(
                  this.customChainId
              ) || defaultNetwork
            : defaultNetwork;
        return network.etherscanApiUrl;
    }

    /**
     * Fetches smart contract ABI from Etherescan implementing their API. This will return a valid answer
     * if the address exists and if the contract's source code is verified.
     *
     * @param address
     * @returns string ABI or undefined
     */
    private async _fetchABIFromEtherscan(
        address: string
    ): Promise<string | undefined> {
        const etherscanAPI = this._getEtherscanApiUrl();
        if (!etherscanAPI) {
            return undefined;
        }

        let retry = 0;
        // this retry is for the rate limit of the api.
        // as the rate limit error is a valid http response retryHandling does not catch it.
        while (retry < MAX_REQUEST_RETRY) {
            // this retry is for network/http errors
            const result = await retryHandling(
                () =>
                    httpClient.get<{
                        status: string;
                        result: string;
                        message?: string;
                    }>(
                        `${etherscanAPI}/api`,
                        {
                            module: 'contract',
                            action: 'getabi',
                            address,
                        },
                        30000
                    ),
                API_CALLS_DELAY
            );

            if (
                result.status === '0' &&
                result.message &&
                result.message === 'NOTOK'
            ) {
                await sleep(API_CALLS_DELAY);
                retry++;

                continue;
            }

            return result.status === '1' ? result.result : undefined;
        }

        return undefined;
    }

    /**
     * Parses transaction data using the transaction description
     */
    private _parseTransactionDescription(
        parsedTransaction: TransactionDescription
    ): ContractMethodSignature {
        const args = parsedTransaction.functionFragment.inputs.map(
            (i, index) => {
                return {
                    name: i.name,
                    type: i.type,
                    value: parsedTransaction.args[i.name || index],
                };
            }
        );

        // Format name
        let parsedName = parsedTransaction.name;

        if (parsedName.length > 1) {
            parsedName =
                parsedName.charAt(0).toUpperCase() + parsedName.slice(1);
            parsedName = parsedName
                .replace(/_/g, ' ')
                .split(/([A-Z][a-z]+)/)
                .filter(function (e) {
                    return e;
                })
                .join(' ');
        }

        return {
            name: parsedName,
            args,
        };
    }

    /**
     * Looks up method signature in 4bytes API. If there's no result for the specified signature, it fallbacks to
     * SignatureRegistry contract.
     *
     * @param bytes The `0x`-prefixed hexadecimal string representing the four-byte signature of the contract method to lookup.
     * @returns The contract method signature
     */
    private async _lookup(bytes: string): Promise<string[] | undefined> {
        const getSignatureInContract = async (): Promise<
            string[] | undefined
        > => {
            try {
                // If there's no result check on the on chain contract
                const onchainResult: string[] =
                    await this.signatureRegistry.entries(bytes);

                if (onchainResult && onchainResult.length > 0) {
                    return onchainResult;
                } else {
                    throw new Error('function not found in the contract.');
                }
            } catch (error) {
                log.warn(
                    'Error looking up for contract method signature, fallbacking to 4Byte directory',
                    error.message || error
                );
                return getSignatureIn4Byte();
            }
        };

        const getSignatureIn4Byte = async (): Promise<string[] | undefined> => {
            let fourByteResponse: FourByteResponse | undefined = undefined;

            try {
                fourByteResponse = await retryHandling(
                    () =>
                        httpClient.get<FourByteResponse>(
                            `https://www.4byte.directory/api/v1/signatures/`,
                            {
                                hex_signature: bytes,
                            }
                        ),
                    API_CALLS_DELAY
                );
            } catch (error) {
                log.warn(
                    'Error looking up in 4byte',
                    JSON.stringify((error as RequestError).response) ||
                        error.message ||
                        error
                );
            }

            if (fourByteResponse && fourByteResponse.count > 0) {
                const res: string[] = [];
                fourByteResponse.results = this._orderFourByteResults(
                    fourByteResponse.results
                );
                for (let n = 0; n < fourByteResponse.count; n++) {
                    res[n] = fourByteResponse.results[n].text_signature;
                }
                return res;
            }

            return undefined;
        };

        return getSignatureInContract();
    }

    /**
     * It orders the 4Byte results by id asc
     *
     * @param results an array of @type FourByteResponseResult
     * @returns an array of @type FourByteResponseResult ordered
     */
    private _orderFourByteResults(
        results: FourByteResponseResult[]
    ): FourByteResponseResult[] {
        return results.sort((a, b) => {
            if (a.id > b.id) return 1;
            if (a.id < b.id) return -1;
            return 0;
        });
    }

    /**
     * Parses a contract function fragment
     *
     * @param data Transaction data
     * @param methodSignature Transaction signature method
     */
    private _parseFunctionFragment(
        data: string,
        methodSignature: string
    ): TransactionDescription | undefined {
        try {
            const fragment = Fragment.from('function ' + methodSignature);

            const contractInterface = new Interface([fragment]);

            const parsedTransaction = contractInterface.parseTransaction({
                data,
            });

            return parsedTransaction;
        } catch (error) {
            // Possibly the signature didn't belong to this contract
            log.debug(error);
            return undefined;
        }
    }
}
