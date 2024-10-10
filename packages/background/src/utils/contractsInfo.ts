import { toChecksumAddress } from 'ethereumjs-util';
import http, { RequestError } from './http';
import { retryHandling } from './retryHandling';

const CONTRACTS_URL =
    'https://raw.githubusercontent.com/block-wallet/dapps-contracts/main/contracts';

export interface ContractDetails {
    name: string;
    logoURI?: string;
    websiteURL?: string;
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
        const responseText = await retryHandling<string>(
            () =>
                http.request(
                    `${CONTRACTS_URL}/${chainId}/${toChecksumAddress(
                        address
                    )}.json`
                ),
            200,
            3,
            (e: Error) => {
                //if it is not found, then abort.
                return (e as RequestError).status !== 404;
            }
        );

        const contractDetails = JSON.parse(responseText) as ContractDetails;

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
