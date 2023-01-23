import { toChecksumAddress } from 'ethereumjs-util';
import { retryHandling } from './retryHandling';

const CONTRACTS_URL =
    'https://raw.githubusercontent.com/block-wallet/dapps-contracts/main/contracts';

export interface ContractDetails {
    name: string;
    logoURI: string;
    websiteURL: string;
}

export async function fetchContractDetails(
    chainId: number,
    address: string
): Promise<ContractDetails | undefined> {
    try {
        const response = await retryHandling(
            () =>
                fetch(
                    `${CONTRACTS_URL}/${chainId}/${toChecksumAddress(
                        address
                    )}.json`
                ),
            200,
            3
        );
        const file = await response.text();
        return JSON.parse(file) as ContractDetails;
    } catch (e) {
        return undefined;
    }
}
