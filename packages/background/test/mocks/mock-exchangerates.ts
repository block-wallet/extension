import BlockFetchController, {
    BlockFetchControllerState,
    BLOCKS_TO_WAIT_BEFORE_CHECHKING_FOR_CHAIN_SUPPORT,
} from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import { BlockUpdatesControllerState } from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import {
    ExchangeRatesController,
    ExchangeRatesControllerState,
} from '../../src/controllers/ExchangeRatesController';
import { getNetworkControllerInstance } from './mock-network-instance';
import {
    mockPreferencesController,
    mockPreferencesControllerARS,
} from './mock-preferences';
import { Token } from '@block-wallet/background/controllers/erc-20/Token';
import {
    AccountStatus,
    AccountTrackerController,
    AccountTrackerState,
    AccountType,
} from '@block-wallet/background/controllers/AccountTrackerController';
import KeyringControllerDerivated from '@block-wallet/background/controllers/KeyringControllerDerivated';
import {
    TokenController,
    TokenControllerProps,
} from '@block-wallet/background/controllers/erc-20/TokenController';
import { TransactionWatcherController } from '@block-wallet/background/controllers/TransactionWatcherController';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import { mockedPermissionsController } from './mock-permissions';
import { TypedTransaction } from '@ethereumjs/tx';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import { BigNumber } from '@ethersproject/bignumber';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
import { mockKeyringController } from './mock-keyring-controller';

let exchangeRatesControllerETH: ExchangeRatesControllerState;
let blockFetchController: BlockFetchController;
let blockUpdatesController: BlockUpdatesController;
let blockUpdatesControllerState: BlockUpdatesControllerState;
let blockFetchControllerState: BlockFetchControllerState;
let accountTrackerController: AccountTrackerController;
let gasPricesController: GasPricesController;
let transactionController: TransactionController;
let transactionWatcherController: TransactionWatcherController;
let tokenController: TokenController;
let tokenOperationsController: TokenOperationsController;
let accountTrackerControllerState: AccountTrackerState;

exchangeRatesControllerETH = {
    exchangeRates: {},
    networkNativeCurrency: {
        symbol: 'ETH',
        // Default Coingecko id for ETH rates
        coingeckoPlatformId: 'ethereum',
    },
    isRatesChangingAfterNetworkChange: false,
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

tokenOperationsController = new TokenOperationsController({
    networkController: mockedNetworkController,
});

tokenController = new TokenController(
    {
        userTokens: {} as any,
        deletedUserTokens: {} as any,
        cachedPopulatedTokens: {} as any,
    },
    {
        networkController: mockedNetworkController,
        preferencesController: mockPreferencesController,
        tokenOperationsController,
    } as TokenControllerProps
);

gasPricesController = new GasPricesController(
    mockedNetworkController,
    blockUpdatesController,
    initialState.GasPricesController
);

transactionController = new TransactionController(
    mockedNetworkController,
    mockPreferencesController,
    mockedPermissionsController,
    gasPricesController,
    tokenController,
    blockUpdatesController,
    mockKeyringController,
    {
        transactions: [],
        txSignTimeout: 0,
    },
    async () => {
        return '' as unknown as TypedTransaction;
    },
    { txHistoryLimit: 40 }
);

transactionWatcherController = new TransactionWatcherController(
    mockedNetworkController,
    mockPreferencesController,
    blockUpdatesController,
    tokenController,
    transactionController,
    {
        transactions: {},
        tokenAllowanceEvents: {},
    }
);

// Mock Account tracker data

const ACCOUNT_ADDRESS = '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1';
const TOKENS = [
    new Token(
        '0x41A3Dba3D677E573636BA691a70ff2D606c29666',
        'GoBlank',
        'BLANK',
        18
    ),
    new Token(
        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
        'Dai Stablecoin',
        'DAI',
        18
    ),
];

accountTrackerControllerState = {
    ...initialState.AccountTrackerController,
    accounts: {
        [ACCOUNT_ADDRESS]: {
            name: 'Account 1',
            allowances: {},
            index: 1,
            status: AccountStatus.ACTIVE,
            address: ACCOUNT_ADDRESS,
            accountType: AccountType.HD_ACCOUNT,
            balances: {
                [mockedNetworkController.network.chainId]: {
                    nativeTokenBalance: BigNumber.from(1),
                    tokens: {
                        [TOKENS[0].address]: {
                            token: TOKENS[0],
                            balance: BigNumber.from(1),
                        },
                        [TOKENS[1].address]: {
                            token: TOKENS[1],
                            balance: BigNumber.from(1),
                        },
                    },
                },
            },
        },
    },
};

accountTrackerController = new AccountTrackerController(
    new KeyringControllerDerivated({}),
    mockedNetworkController,
    tokenController,
    tokenOperationsController,
    mockPreferencesController,
    blockUpdatesController,
    transactionWatcherController,
    transactionController,
    accountTrackerControllerState
);

export function getExchangeRateMockController(currency: 'USD' | 'ARS') {
    return new ExchangeRatesController(
        exchangeRatesControllerETH,
        currency === 'USD'
            ? mockPreferencesController
            : mockPreferencesControllerARS,
        mockedNetworkController,
        blockUpdatesController,
        accountTrackerController
    );
}
