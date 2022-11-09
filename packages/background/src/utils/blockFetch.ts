import { ethers } from 'ethers';
import { SECOND } from './constants/time';
import { Block } from '@ethersproject/abstract-provider';
import log from 'loglevel';
import { sleep } from './sleep';

const FETCH_BLOCK_SLEEP = 1 * SECOND;
const MAX_REQUEST_RETRY = 10;

export async function fetchBlockWithRetries(
    blockNumber: number,
    provider: ethers.providers.StaticJsonRpcProvider,
    maxRetries = MAX_REQUEST_RETRY
): Promise<Block | undefined> {
    let retryCount = 0;
    let block: Block | undefined;
    while (retryCount < maxRetries && !block) {
        try {
            block = await provider.getBlock(blockNumber);
        } catch (e) {
            log.warn('getBlock', e.message || e);
            retryCount++;
            await sleep(FETCH_BLOCK_SLEEP);
        }
    }

    return block;
}
