import { toChecksumAddress } from 'ethereumjs-util';
import { retryHandling } from './retryHandling';

const CONTRACTS_URL =
    'https://raw.githubusercontent.com/block-wallet/dapps-contracts/main/contracts';

export interface ContractDetails {
    name: string;
    logoURI: string;
    websiteURL: string;
}

function ensureURLWithProtocol(url: string): string {
    return url.startsWith('http') || url.startsWith('https')
        ? url
        : `https://${url}`;
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
        const contractDetails = JSON.parse(file) as ContractDetails;

        if (!contractDetails) {
            return contractDetails;
        }

        return {
            ...contractDetails,
            logoURI: contractDetails.logoURI
                ? ensureURLWithProtocol(contractDetails.logoURI)
                : contractDetails.logoURI,
        };
    } catch (e) {
        return undefined;
    }
}
