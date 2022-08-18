import NetworkController from '../NetworkController';
import erc721Abi from './abi';
import { BigNumber, ethers } from 'ethers';
import { tokenAddressParamNotPresentError } from '../erc-20/TokenController';

export interface NFTContractProps {
    networkController: NetworkController;
}

export class NFTContract {
    protected readonly _networkController: NetworkController;

    constructor(props: NFTContractProps) {
        this._networkController = props.networkController;
    }

    /**
     * Generates a new instance of the contract for a token address
     *
     * @param contractAddress NFT contract address
     */
    protected getContract(contractAddress: string): ethers.Contract {
        if (!contractAddress) {
            tokenAddressParamNotPresentError;
        }

        return new ethers.Contract(
            contractAddress,
            erc721Abi,
            this._networkController.getProvider()
        );
    }

    /**
     * Get the contract name
     *
     * @param contractAddress NFT contract address
     */
    public async name(contractAddress: string): Promise<string> {
        if (!contractAddress) {
            throw tokenAddressParamNotPresentError;
        }

        const contract = this.getContract(contractAddress);
        return contract.name();
    }

    /**
     * Get the token URI
     *
     * @param contractAddress NFT contract address
     * @param tokenId NFT id
     */
    public async tokenURI(
        contractAddress: string,
        tokenId: BigNumber
    ): Promise<string> {
        if (!contractAddress) {
            throw tokenAddressParamNotPresentError;
        }
        if (!BigNumber.isBigNumber(tokenId)) {
            throw new Error('Token ID not present');
        }

        const contract = this.getContract(contractAddress);
        return contract.tokenURI(tokenId._hex);
    }
}
