import { expect } from 'chai';
import sinon from 'sinon';

import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import { INITIAL_NETWORKS } from '../../src/utils/constants/networks';
import {
    AccountBalanceToken,
    Accounts,
    AccountStatus,
    AccountTrackerController,
    AccountType,
} from '../../src/controllers/AccountTrackerController';
import NetworkController from '../../src/controllers/NetworkController';
import { mockPreferencesController } from '../mocks/mock-preferences';
import {
    NATIVE_TOKEN_ADDRESS,
    TokenController,
    TokenControllerProps,
} from '../../src/controllers/erc-20/TokenController';
import { PreferencesController } from '../../src/controllers/PreferencesController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/Transaction';
import initialState from '@block-wallet/background/utils/constants/initialState';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import KeyringControllerDerivated from '@block-wallet/background/controllers/KeyringControllerDerivated';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import { TransactionWatcherController } from '@block-wallet/background/controllers/TransactionWatcherController';
import {
    ITokens,
    Token,
} from '@block-wallet/background/controllers/erc-20/Token';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import { TypedTransaction } from '@ethereumjs/tx';
import { mockedPermissionsController } from 'test/mocks/mock-permissions';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import PermissionsController from '@block-wallet/background/controllers/PermissionsController';

describe('AccountTracker controller implementation', function () {
    const accounts = {
        goerli: [
            {
                key: '7fe1315d0fa2f408dacddb41deacddec915e85c982e9cbdaacc6eedcb3f9793b',
                address: '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1',
            },
            {
                key: '4b95973deb96905fd605d765f31d1ce651e627d61c136fa2b8eb246a3c549ebe',
                address: '0xbda8C7b7B5d0579Eb18996D1f684A434E4fF701f',
            },
        ],
    };
    let tokenController: TokenController;
    let preferencesController: PreferencesController;
    let accountTrackerController: AccountTrackerController;
    let networkController: NetworkController;
    let tokenOperationsController: TokenOperationsController;
    let blockUpdatesController: BlockUpdatesController;
    let transactionWatcherController: TransactionWatcherController;
    let gasPricesController: GasPricesController;
    let permissionsController: PermissionsController;
    let transactionController: TransactionController;

    this.beforeAll(() => {
        // Instantiate objects
        networkController = getNetworkControllerInstance();

        blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );

        preferencesController = mockPreferencesController;

        tokenOperationsController = new TokenOperationsController({
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
                preferencesController,
                tokenOperationsController,
            } as TokenControllerProps
        );

        gasPricesController = new GasPricesController(
            networkController,
            blockUpdatesController,
            initialState.GasPricesController
        );
        permissionsController = mockedPermissionsController;

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

        transactionWatcherController = new TransactionWatcherController(
            networkController,
            preferencesController,
            blockUpdatesController,
            tokenController,
            transactionController,
            {
                transactions: {},
            }
        );

        accountTrackerController = new AccountTrackerController(
            new KeyringControllerDerivated({}),
            networkController,
            tokenController,
            tokenOperationsController,
            preferencesController,
            blockUpdatesController,
            transactionWatcherController
        );
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Should init properly', () => {
        const { accounts } = accountTrackerController.store.getState();
        expect(accounts).to.be.empty;
    });

    describe('AccountTracker balance', () => {
        it('Should add the newly added user tokens with zero balance to the list', () => {
            sinon.stub(TokenController.prototype, 'getUserTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                        '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66': new Token(
                            '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                        '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C': new Token(
                            '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C',
                            'Goerli USDC',
                            'USDC',
                            18
                        ),
                    });
                })
            );

            let { accounts } = accountTrackerController.store.getState();

            Object.values(accounts).forEach((a) => {
                expect(a.balances[5]).to.be.empty;
            });

            accountTrackerController.updateAccounts({
                assetAddresses: [
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                    '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C',
                ],
            });
            ({ accounts } = accountTrackerController.store.getState());

            Object.values(accounts).forEach((a) => {
                const tokensArray = Object.values(a.balances[5].tokens);
                expect(tokensArray.length).to.be.equal(3);
                expect(a.balances[5].tokens[0].token.address).to.be.equal(
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                );
                expect(a.balances[5].tokens[1].token.address).to.be.equal(
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                );
                expect(a.balances[5].tokens[2].token.address).to.be.equal(
                    '0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C'
                );

                expect(a.balances[5].tokens[0].balance.toString()).to.be.equal(
                    '0'
                );
                expect(a.balances[5].tokens[1].balance.toString()).to.be.equal(
                    '0'
                );
                expect(a.balances[5].tokens[2].balance.toString()).to.be.equal(
                    '0'
                );
            });
        });

        it('An account without eth balance', async () => {
            const accountAddress = '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },

                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        name: 'Account 1',
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                addresses: [accountAddress],
                assetAddresses: [NATIVE_TOKEN_ADDRESS],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(
                accounts[accountAddress].balances[5].nativeTokenBalance._hex
            ).equal(BigNumber.from('0x00')._hex);
        });

        it('An account without eth balance without specifying the account', async () => {
            const accountAddress = '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },

                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                        name: 'Account 1',
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [NATIVE_TOKEN_ADDRESS],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(
                accounts[accountAddress].balances[5].nativeTokenBalance._hex
            ).equal(BigNumber.from('0x00')._hex);
        });

        it('An account with eth balance', async () => {
            const accountAddress = '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        name: 'Account 1',
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                addresses: [accountAddress],
                assetAddresses: [NATIVE_TOKEN_ADDRESS],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(
                accounts[accountAddress].balances[5].nativeTokenBalance._hex
            ).not.equal(BigNumber.from('0x00')._hex);
        });

        it('An account with eth balance without specifying the account', async () => {
            const accountAddress = '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                        name: 'Account 1',
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [NATIVE_TOKEN_ADDRESS],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(
                accounts[accountAddress].balances[5].nativeTokenBalance._hex
            ).not.equal(BigNumber.from('0x00')._hex);
        });

        it('A simple token balance check without balance', async () => {
            const accountAddress = '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            const assetAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [assetAddress],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(accounts[accountAddress].balances[5].tokens).to.be.empty;
        });

        it('A simple token balance check with balance', async () => {
            const accountAddress = '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1';
            const assetAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [assetAddress],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(accounts[accountAddress].balances[5].tokens).to.be.not.empty;
            expect(
                accounts[accountAddress].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
        });

        it('A simple token balance check without balance but with manually added tokens', async () => {
            sinon.stub(TokenController.prototype, 'getUserTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66': new Token(
                            '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                    });
                })
            );
            const accountAddress = '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: ['0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress]).to.be.not.null;
            expect(accounts[accountAddress].address).equal(accountAddress);
            expect(accounts[accountAddress].balances[5].tokens).to.be.not.empty;
            expect(
                accounts[accountAddress].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.not.null;
        });

        it('A multiple accounts check without token balance', async () => {
            const accountAddress1 =
                '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            const accountAddress2 =
                '0x0d19882936d1b99701470853cb948583979203d3';
            const accountAddress3 =
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            const assetAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x0d19882936d1b99701470853cb948583979203d3': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 2',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress3,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 3',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                addresses: [accountAddress1, accountAddress2, accountAddress3],
                assetAddresses: [assetAddress],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.empty;
            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(accounts[accountAddress2].balances[5].tokens).to.be.empty;
            expect(accounts[accountAddress3]).to.be.not.null;
            expect(accounts[accountAddress3].address).equal(accountAddress3);
            expect(accounts[accountAddress3].balances[5].tokens).to.be.empty;
        });

        it('A multiple accounts check without token balance without specifying the account', async () => {
            const accountAddress1 =
                '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            const accountAddress2 =
                '0x0d19882936d1b99701470853cb948583979203d3';
            const accountAddress3 =
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            const assetAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x0d19882936d1b99701470853cb948583979203d3': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 2',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress3,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 3',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [assetAddress],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.empty;
            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(accounts[accountAddress2].balances[5].tokens).to.be.empty;
            expect(accounts[accountAddress3]).to.be.not.null;
            expect(accounts[accountAddress3].address).equal(accountAddress3);
            expect(accounts[accountAddress3].balances[5].tokens).to.be.empty;
        });

        it('A multiple accounts check with balance', async () => {
            const accountAddress1 =
                '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1';
            const accountAddress2 =
                '0x604D5299227E91ee85899dCDbFfe1505bC1E3233';
            const assetAddress = '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x604D5299227E91ee85899dCDbFfe1505bC1E3233': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 2',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                addresses: [accountAddress1, accountAddress2],
                assetAddresses: [assetAddress],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.not
                .empty;
            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(accounts[accountAddress2].balances[5].tokens).to.be.not
                .empty;
        });

        it('A multiple accounts check without token balance but with manually added tokens', async () => {
            sinon.stub(TokenController.prototype, 'getUserTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                        '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66': new Token(
                            '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                            'Goerli USDT',
                            'USDT',
                            18
                        ),
                    });
                })
            );
            const accountAddress1 =
                '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            const accountAddress2 =
                '0x0d19882936d1b99701470853cb948583979203d3';
            const accountAddress3 =
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x0d19882936d1b99701470853cb948583979203d3': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        name: 'Account 2',
                        status: AccountStatus.ACTIVE,
                    },
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress3,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 3',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                ],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress1].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress1].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.not.null;

            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(accounts[accountAddress2].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress2].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress2].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.not.null;

            expect(accounts[accountAddress3]).to.be.not.null;
            expect(accounts[accountAddress3].address).equal(accountAddress3);
            expect(accounts[accountAddress3].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress3].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress3].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.not.null;
        });

        it('A multiple accounts check without token balance but with manually added tokens and manually deleted tokens', async () => {
            sinon.stub(TokenController.prototype, 'getUserTokens').returns(
                new Promise<ITokens>((resolve) => {
                    resolve({
                        '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60': new Token(
                            '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                            'Goerli DAI',
                            'DAI',
                            18
                        ),
                    });
                })
            );
            sinon
                .stub(TokenController.prototype, 'getDeletedUserTokens')
                .returns(
                    new Promise<ITokens>((resolve) => {
                        resolve({
                            '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66':
                                new Token(
                                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                                    'Goerli USDT',
                                    'USDT',
                                    18
                                ),
                        });
                    })
                );
            const accountAddress1 =
                '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4';
            const accountAddress2 =
                '0x0d19882936d1b99701470853cb948583979203d3';
            const accountAddress3 =
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x25f3f89bc136975c10a1afe9ad70695a4f451ac4': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x0d19882936d1b99701470853cb948583979203d3': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 2',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress3,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 3',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: [
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66',
                ],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress1].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress1].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.undefined;

            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(accounts[accountAddress2].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress2].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress2].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.undefined;

            expect(accounts[accountAddress3]).to.be.not.null;
            expect(accounts[accountAddress3].address).equal(accountAddress3);
            expect(accounts[accountAddress3].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress3].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(
                accounts[accountAddress3].balances[5].tokens[
                    '0xb7FC2023D96AEa94Ba0254AA5Aeb93141e4aad66'
                ]
            ).to.be.undefined;
        });

        it('A multiple accounts check with balance and without balance', async () => {
            const accountAddress1 =
                '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1';
            const accountAddress2 =
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd';
            accountTrackerController.store.updateState({
                accounts: {
                    '0x281ae730d284bDA68F4e9Ac747319c8eDC7dF3B1': {
                        address: accountAddress1,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 1',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                        address: accountAddress2,
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: 'Account 2',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            await accountTrackerController.updateAccounts({
                assetAddresses: ['0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'],
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(accounts).to.be.not.null;
            expect(accounts[accountAddress1]).to.be.not.null;
            expect(accounts[accountAddress1].address).equal(accountAddress1);
            expect(accounts[accountAddress1].balances[5].tokens).to.be.not
                .empty;
            expect(
                accounts[accountAddress1].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.not.null;
            expect(accounts[accountAddress2]).to.be.not.null;
            expect(accounts[accountAddress2].address).equal(accountAddress2);
            expect(
                accounts[accountAddress2].balances[5].tokens[
                    '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60'
                ]
            ).to.be.undefined;
        });
    }).timeout(60000);

    describe('AccountTracker methods with mocked etherjs', () => {
        before(async () => {
            // Stub ethers methods
            sinon.stub(ethers, 'Contract').returns({
                balances: (
                    addresses: string[],
                    _ethBalance: string[]
                ): BigNumber[] => addresses.map(() => BigNumber.from('999')),
            } as any);

            // Stub NetworkController methods
            const eventEmitter = new EventEmitter();
            sinon.stub(NetworkController.prototype, 'getProvider').returns({
                ...eventEmitter,
                getBlockNumber: (): Promise<number> =>
                    new Promise((resolve) => resolve(1)),
                getBlock: (_blockNumber: number) =>
                    new Promise((resolve) =>
                        resolve({
                            gasLimit: BigNumber.from('88888'),
                        })
                    ),
            } as any);

            sinon.stub(NetworkController.prototype, 'getNetwork').returns(
                new Promise((resolve) =>
                    resolve({
                        chainId: INITIAL_NETWORKS.KOVAN.chainId,
                    } as any)
                )
            );
        });

        it('Should sync the accounts with the local store', () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from(0),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });

            const { accounts } = accountTrackerController.store.getState();

            expect(Object.keys(accounts).length).to.be.equal(2);
            expect(Object.keys(accounts)).to.contain('0xff');
        });

        /*
    it('Should add an account', () => {
      const { accounts } = accountTrackerController.store.getState()

      expect(accounts).to.be.empty
      accountTrackerController.createAccount('test account')
      expect(accounts).to.not.be.empty
      expect(Object.keys(accounts)).to.contain('0xff')
    })
    */

        it('Should not let you remove a non-external account', () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            const { accounts } = accountTrackerController.store.getState();
            expect(accounts).to.not.be.empty;

            expect(accountTrackerController.removeAccount('0xfa')).to.throw;
            expect(accounts).to.not.be.empty;
            expect(Object.keys(accounts)).to.contain('0xff');
        });

        it('Should remove an external account', () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            const { accounts } = accountTrackerController.store.getState();
            expect(accounts).to.not.be.empty;

            expect(accountTrackerController.removeAccount('0xfa')).to.throw;
            expect(accounts).to.not.be.empty;
            expect(Object.keys(accounts)).to.contain('0xff');
        });

        it('Should remove an external account', () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            const { accounts } = accountTrackerController.store.getState();
            expect(accounts).to.not.be.empty;

            accountTrackerController.removeAccount('0xff');
            expect(accounts).to.not.be.empty;
            expect(Object.keys(accounts)).to.not.contain('0xff');
        });

        it('Should clear the accounts', () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            const { accounts: withAccounts } =
                accountTrackerController.store.getState();
            expect(withAccounts).to.not.be.empty;

            accountTrackerController.clearAccounts();
            const { accounts } = accountTrackerController.store.getState();
            expect(accounts).to.equal(
                initialState.AccountTrackerController.accounts
            );
        });

        it('Should hidde an account', async () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfe': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            let { accounts, hiddenAccounts } =
                accountTrackerController.store.getState();
            expect(accounts).to.not.be.empty;

            expect(Object.keys(hiddenAccounts)).to.have.length(0);

            await accountTrackerController.hideAccount('0xfa');
            ({ accounts, hiddenAccounts } =
                accountTrackerController.store.getState());

            expect(accounts).to.not.be.empty;
            expect(Object.keys(accounts)).to.have.length(2);
            expect(Object.keys(hiddenAccounts)).to.have.length(1);
            expect(Object.keys(hiddenAccounts)).to.contain('0xfa');

            expect(Object.keys(accounts)).to.not.contain('0xfa');

            expect(hiddenAccounts['0xfa'].status).to.equal(
                AccountStatus.HIDDEN
            );
        });

        it('Should unhidde an account', async () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                },
                hiddenAccounts: {
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.HIDDEN,
                    },
                },
            });
            const { accounts, hiddenAccounts } =
                accountTrackerController.store.getState();
            expect(Object.keys(hiddenAccounts)).to.have.length(1);
            expect(Object.keys(hiddenAccounts)).to.have.length(1);

            await accountTrackerController.unhideAccount('0xfa');
            expect(accounts).to.not.be.empty;
            expect(Object.keys(accounts)).to.have.length(2);
            expect(Object.keys(hiddenAccounts)).to.have.length(0);
            expect(Object.keys(accounts)).to.contain('0xfa');

            expect(accounts['0xfa'].status).to.equal(AccountStatus.ACTIVE);
        });

        it('Should fail to hide the last internal account', async () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                    '0xfa': {
                        address: '0xfa',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.HD_ACCOUNT,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            expect(accountTrackerController.hideAccount('0xfa')).to.throw;
        });

        it('Should fail to hide a non-internal account', async () => {
            accountTrackerController.store.updateState({
                accounts: {
                    '0xff': {
                        address: '0xff',
                        balances: {
                            5: {
                                nativeTokenBalance: BigNumber.from('1000'),
                                tokens: {},
                            },
                        },
                        name: '',
                        index: 0,
                        accountType: AccountType.EXTERNAL,
                        status: AccountStatus.ACTIVE,
                    },
                },
            });
            expect(accountTrackerController.hideAccount('0xff')).to.throw;
        });

        /*
    it('Should populate account balances', async () => {
      accountTrackerController.store.updateState({
        accounts: {
          '0xff': {
            address: '0xff',
            balances: {5:{nativeTokenBalance:BigNumber.from(0), tokens:{}}},
            name: '',

          },
          '0xaa': {
            address: '0xaa',
            balances: {5:{nativeTokenBalance:BigNumber.from(0), tokens:{}}},
            name: '',

          },
          '0xbb': {
            address: '0xbb',
            balances: {5:{nativeTokenBalance:BigNumber.from(0), tokens:{}}},
            name: '',

          },
        },
      })

      await accountTrackerController.updateAccounts({assetsAutoDiscovery: true})

      const { accounts } = accountTrackerController.store.getState()

      assert.deepEqual(accounts, {
        '0xff': {
          address: '0xff',
          balance: BigNumber.from('999'),
          name: '',

        },
        '0xaa': {
          address: '0xaa',
          balance: BigNumber.from('999'),
          name: '',

        },
        '0xbb': {
          address: '0xbb',
          balance: BigNumber.from('999'),
          name: '',

        },
      })
    })
  */

        after(function () {
            sinon.restore();
        });
    });

    describe('Balance reconstruction for chain', async () => {
        it('Reconstruction does not needed', async () => {
            const accounts = {
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                    address: '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd',
                    status: AccountStatus.ACTIVE,
                    balances: {
                        5: {
                            nativeTokenBalance: BigNumber.from(100),
                            tokens: {
                                '0x0': {
                                    balance: BigNumber.from(1),
                                } as AccountBalanceToken,
                                '0x1': {
                                    balance: BigNumber.from(2),
                                } as AccountBalanceToken,
                            },
                        },
                        6: {
                            nativeTokenBalance: BigNumber.from(45),
                            tokens: {
                                '0x0': {
                                    balance: BigNumber.from(99),
                                } as AccountBalanceToken,
                                '0x1': {
                                    balance: BigNumber.from(98),
                                } as AccountBalanceToken,
                            },
                        },
                    },

                    index: 0,
                    accountType: AccountType.HD_ACCOUNT,
                    name: 'Account 1',
                },
            } as Accounts;

            accountTrackerController.store.updateState({
                accounts: accounts,
            });

            (accountTrackerController as any)['_buildBalancesForChain'](5);

            expect(
                accountTrackerController.store.getState().accounts
            ).deep.equal(accounts);
        });

        it('Reconstruction needed', async () => {
            const accounts = {
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                    address: '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd',
                    status: AccountStatus.ACTIVE,
                    balances: {
                        6: {
                            nativeTokenBalance: BigNumber.from(45),
                            tokens: {
                                '0x0': {
                                    balance: BigNumber.from(99),
                                } as AccountBalanceToken,
                                '0x1': {
                                    balance: BigNumber.from(98),
                                } as AccountBalanceToken,
                            },
                        },
                    },

                    index: 0,
                    accountType: AccountType.HD_ACCOUNT,
                    name: 'Account 1',
                },
            } as Accounts;

            accountTrackerController.store.updateState({
                accounts: accounts,
            });

            (accountTrackerController as any)['_buildBalancesForChain'](5);

            expect(
                accountTrackerController.store.getState().accounts
            ).deep.equal({
                '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd': {
                    address: '0x3399ee50696cf10dc88d0e11c3fe57f8aa46e0dd',
                    status: AccountStatus.ACTIVE,
                    balances: {
                        5: {
                            nativeTokenBalance: BigNumber.from(0),
                            tokens: {},
                        },
                        6: {
                            nativeTokenBalance: BigNumber.from(45),
                            tokens: {
                                '0x0': {
                                    balance: BigNumber.from(99),
                                } as AccountBalanceToken,
                                '0x1': {
                                    balance: BigNumber.from(98),
                                } as AccountBalanceToken,
                            },
                        },
                    },

                    index: 0,
                    accountType: AccountType.HD_ACCOUNT,
                    name: 'Account 1',
                },
            } as Accounts);
        });
    });
});
