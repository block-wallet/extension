import { id } from '@ethersproject/hash';
import { hexZeroPad } from 'ethers/lib/utils';
import { WatchedTransactionType } from '../controllers/transactions/utils/types';

type ChainTopics = (string | null)[];

const SIGNATURES: { [type in WatchedTransactionType]: string } = {
    txlist: '',
    tokentx: id('Transfer(address,address,uint256)'),
    token1155tx: '',
    tokennfttx: '',
};

const TOKEN_ALLOWACE_SIGNATURES: { [type in WatchedTransactionType]: string } =
    {
        txlist: '',
        tokentx: id('Approval(address,address,uint256)'),
        token1155tx: 'ApprovalForAll(address,address,bool)',
        tokennfttx: id('Approval(address,address,uint256)'), //maybe add ApprovalForAll(address,address,bool)??
    };

function padAddress(address: string): string {
    return hexZeroPad(address, 32);
}

export function getIncomingERC20LogsTopics(
    address: string,
    transactionType: WatchedTransactionType
): ChainTopics {
    const addressHashed = padAddress(address);
    return [SIGNATURES[transactionType], null, addressHashed];
}

export function getOutgoingERC20LogsTopics(
    address: string,
    transactionType: WatchedTransactionType
): ChainTopics {
    const addressHashed = padAddress(address);
    return [SIGNATURES[transactionType], addressHashed];
}

export function getTokenApprovalLogsTopics(
    address: string,
    transactionType: WatchedTransactionType,
    spenderAddress?: string
): ChainTopics {
    const addressHashed = hexZeroPad(address, 32);
    const topics = [TOKEN_ALLOWACE_SIGNATURES[transactionType], addressHashed];
    if (spenderAddress) {
        topics.push(hexZeroPad(spenderAddress, 32));
    }
    return topics;
}

export function chainTopicsToAPITopics(
    chainQueryTopics: ChainTopics
): Record<string, string> {
    const topicsOperators: Record<string, string> = {};
    if (chainQueryTopics.length > 1) {
        for (let i = 0; i < chainQueryTopics.length - 1; i++) {
            topicsOperators[`topic${i}_${i + 1}_opr`] = 'and';
        }
    }
    const apiTopics = chainQueryTopics.reduce((acc, topic, index) => {
        return {
            ...acc,
            [`topic${index}`]: topic,
        };
    }, {});
    return {
        ...apiTopics,
        ...topicsOperators,
    };
}

export function getAllowanceSignatureForType(
    transactionType: WatchedTransactionType
): string {
    return TOKEN_ALLOWACE_SIGNATURES[transactionType];
}
