import BlockFetchController, {
    BlockFetchControllerState,
    BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
} from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import { BlockUpdatesControllerState } from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import sinon from 'sinon';
import {
    ExchangeRatesController,
    ExchangeRatesControllerState,
} from '../../src/controllers/ExchangeRatesController';
import { getNetworkControllerInstance } from './mock-network-instance';
import {
    mockPreferencesController,
    mockPreferencesControllerARS,
} from './mock-preferences';
import MockProvider from './mock-provider';
import { Token } from '@block-wallet/background/controllers/erc-20/Token';

let exchangeRatesControllerETH: ExchangeRatesControllerState;
let blockFetchController: BlockFetchController;
let blockUpdatesController: BlockUpdatesController;
let blockUpdatesControllerState: BlockUpdatesControllerState;
let blockFetchControllerState: BlockFetchControllerState;

exchangeRatesControllerETH = {
    exchangeRates: {},
    networkNativeCurrency: {
        symbol: 'ETH',
        // Default Coingecko id for ETH rates
        coingeckoPlatformId: 'ethereum',
    },
};

const mockedNetworkController = getNetworkControllerInstance();

blockUpdatesControllerState = {
    blockData: {},
};

blockFetchControllerState = {
    blockFetchData: {
        1: {
            offChainSupport: false,
            checkingOffChainSupport: false,
            currentBlockNumber: 0,
            lastBlockOffChainChecked:
                -1 * BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
        },
    },
};

blockFetchController = new BlockFetchController(
    mockedNetworkController,
    blockFetchControllerState
);

blockUpdatesController = new BlockUpdatesController(
    mockedNetworkController,
    blockFetchController,
    blockUpdatesControllerState
);

const mockExchangeRatesController = new ExchangeRatesController(
    exchangeRatesControllerETH,
    mockPreferencesController,
    mockedNetworkController,
    blockUpdatesController,
    () => {
        const token = new Token(
            '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
            'GoBlank',
            'BLANK',
            18
        );
        const token2 = new Token(
            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
            'Dai Stablecoin',
            'DAI',
            18
        );
        const res = {
            '0x0859D5C40e6B274d4a953014c65405316f55c369': { token, token2 },
        };
        return res;
    }
);

const mockExchangeRatesControllerARS = new ExchangeRatesController(
    exchangeRatesControllerETH,
    mockPreferencesControllerARS,
    mockedNetworkController,
    blockUpdatesController,
    () => {
        const token = new Token(
            '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
            'GoBlank',
            'BLANK',
            18
        );
        const token2 = new Token(
            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
            'Dai Stablecoin',
            'DAI',
            18
        );
        const res = {
            '0x0859D5C40e6B274d4a953014c65405316f55c369': { token, token2 },
        };
        return res;
    }
);

export { mockExchangeRatesController, mockExchangeRatesControllerARS };
