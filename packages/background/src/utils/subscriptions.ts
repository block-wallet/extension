/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isHexString } from 'ethers/lib/utils';
import { isValidHexAddress } from '../controllers/transactions/utils/utils';
import { Block } from './types/ethereum';

export const validateLogSubscriptionRequest = (filterParams: {
    address: string;
    topics: Array<string | Array<string> | null>;
}): void => {
    if ('address' in filterParams && 'topics' in filterParams) {
        if (!isValidHexAddress(filterParams.address)) {
            throw new Error(
                'Invalid eth_subscription request (Invalid address)'
            );
        }
        if (!filterParams.topics) {
            throw new Error(
                'Invalid eth_subscription request (Invalid topics)'
            );
        }

        if (!Array.isArray(filterParams.topics)) {
            throw new Error(
                'Invalid eth_subscription request (Invalid topics)'
            );
        }

        filterParams.topics.forEach((topic) => {
            if (Array.isArray(topic)) {
                topic.forEach((iTopic) => {
                    if (!isHexString(iTopic)) {
                        throw new Error(
                            'Invalid eth_subscription request (Invalid topics)'
                        );
                    }
                });
            } else {
                if (topic != null) {
                    if (!isHexString(topic)) {
                        throw new Error(
                            'Invalid eth_subscription request (Invalid topics)'
                        );
                    }
                }
            }
        });
    } else {
        throw new Error('Invalid eth_subscription request');
    }
};

export const parseBlock = (block: any): Block => {
    return {
        parentHash: block.parentHash,
        sha3Uncles: block.sha3Uncles,
        miner: block.miner,
        stateRoot: block.stateRoot,
        transactionsRoot: block.transactionsRoot,
        receiptsRoot: block.receiptsRoot,
        logsBloom: block.logsBloom,
        difficulty: block.difficulty,
        number: block.number,
        gasLimit: block.gasLimit,
        gasUsed: block.gasUsed,
        timestamp: block.timestamp,
        extraData: block.extraData,
        mixHash: block.mixHash,
        nonce: block.nonce,
        baseFeePerGas: block.baseFeePerGas,
        hash: block.hash,
    } as Block;
};
