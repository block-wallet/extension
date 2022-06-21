import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { SwapController } from '../../src/controllers/SwapController';
import { mockPreferencesController } from '../mocks/mock-preferences';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import { mockedPermissionsController } from '../mocks/mock-permissions';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { TokenController } from '@block-wallet/background/controllers/erc-20/TokenController';

const mnemonic =
    'reject hood palace sad female review depth camp clown peace social real behave rib ability cereal grab illness settle process gate lizard uniform glimpse';

const accounts = {
    goerli: [
        {
            key: '',
            address: '',
        },
        {
            key: '',
            address: '',
        },
    ],
};

const preferencesController = mockPreferencesController;
const permissionsController = mockedPermissionsController;
let transactionController: TransactionController;
let blockUpdatesController: BlockUpdatesController;
let tokenController: TokenController;

describe.skip('Swap Controller', () => {
    const networkController = getNetworkControllerInstance();
    blockUpdatesController = new BlockUpdatesController(
        networkController,
        new BlockFetchController(networkController, {
            blockFetchData: {},
        }),
        { blockData: {} }
    );

    const gasPricesController = new GasPricesController(
        networkController,
        blockUpdatesController,
        initialState.GasPricesController
    );
    const tokenOperationsController = new TokenOperationsController({
        networkController: networkController,
    });

    tokenController = new TokenController(
        {
            userTokens: {} as any,
            deletedUserTokens: {} as any,
            cachedPopulatedTokens: {} as any,
        },
        {
            networkController,
            preferencesController: preferencesController,
            tokenOperationsController: new TokenOperationsController({
                networkController: networkController,
            }),
        }
    );

    transactionController = new TransactionController(
        networkController,
        preferencesController,
        permissionsController,
        gasPricesController,
        tokenController,
        blockUpdatesController,
        {
            transactions: [],
            txSignTimeout: 0,
        },
        async (ethTx: TypedTransaction) => {
            const privateKey = Buffer.from(accounts.goerli[0].key, 'hex');
            return Promise.resolve(ethTx.sign(privateKey));
        },
        { txHistoryLimit: 40 }
    );

    let swapController: SwapController;
    beforeEach(() => {
        swapController = new SwapController({
            networkController: networkController,
            preferencesController: mockPreferencesController,
            transactionController: transactionController,
            tokenOperationsController: tokenOperationsController,
            gasPricesController: gasPricesController,
        });
    });

    it('Should properly check if the current account approved the spender', async () => {
        const response = await swapController.isApproved(
            BigNumber.from('1000000000'),
            '0xaec7e1f531bb09115103c53ba76829910ec48966'
        );

        expect(response).to.be.false;
    });

    it('Should return a proper quote of a swap', async () => {
        const response = await swapController.getQuote({
            fromTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            toTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            amount: BigNumber.from('1000000'),
        });

        expect(Number(response)).to.be.closeTo(990000, 100000);
    }).timeout(15000);

    it('Should properly get ethereum swap details', async () => {
        const FROM_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's address for testing
        const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // 1inch Ethereum pseudo address
        const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // usdc address
        const ETH_AMOUNT = BigNumber.from('100000000000');
        //const GAS_PRICE = BigNumber.from('50000000000');
        const ROUTER_ADDRESS = '0x11111112542d85b3ef69ae05771c2dccff4faa26';

        const response = await swapController.getSwap({
            fromTokenAddress: ETH_ADDRESS,
            toTokenAddress: USDC_ADDRESS,
            amount: ETH_AMOUNT,
            fromAddress: FROM_ADDRESS,
            slippage: 1,
            //gasPrice: GAS_PRICE,
        });

        expect(response.fromToken.symbol).equal('ETH');
        expect(response.fromToken.name).equal('Ethereum');
        expect(response.fromToken.decimals).equal(18);
        expect(response.fromToken.address).equal(
            '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        );
        expect(response.fromToken.logoURI).equal(
            'https://tokens.1inch.exchange/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
        );

        expect(response.toToken.symbol).equal('USDC');
        expect(response.toToken.name).equal('USD Coin');
        expect(response.toToken.decimals).equal(6);
        expect(response.toToken.address).equal(
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
        );
        expect(response.toToken.logoURI).equal(
            'https://tokens.1inch.exchange/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png'
        );

        expect(response.fromTokenAmount).equal(ETH_AMOUNT.toString());
        expect(Number(response.toTokenAmount)).closeTo(100, 10000);
        expect(response.tx.from).equal(FROM_ADDRESS);
        expect(response.tx.to).equal(ROUTER_ADDRESS);
        expect(response.tx.value.toString()).equal(ETH_AMOUNT.toString());
        //expect(response.tx.gasPrice.toString()).equal(GAS_PRICE.toString());
    }).timeout(15000);

    it('Should get an ethereum swap that you can execute on-chain', async () => {
        const FROM_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik's address for testing
        const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // 1inch Ethereum pseudo address
        const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // usdc address
        const ETH_AMOUNT = BigNumber.from('100000000000');
        //const GAS_PRICE = BigNumber.from('50000000000');
        const ROUTER_ADDRESS = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
        const CHAIN_ID = networkController.network.chainId;

        const swap = await swapController.getSwap({
            fromTokenAddress: ETH_ADDRESS,
            toTokenAddress: USDC_ADDRESS,
            amount: ETH_AMOUNT,
            fromAddress: FROM_ADDRESS,
            slippage: 1,
            //gasPrice: GAS_PRICE,
        });

        const { gasLimit } = await transactionController.estimateGas({
            transactionParams: {
                chainId: CHAIN_ID,
                from: swap.tx.from,
                to: swap.tx.to,
                data: swap.tx.data,
                value: swap.tx.value,
            },
        } as any);

        expect(gasLimit.toNumber()).to.be.closeTo(500000, 450000);
    }).timeout(10000);
});
