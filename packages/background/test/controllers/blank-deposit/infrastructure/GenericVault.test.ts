import { GenericVault } from '@block-wallet/background/controllers/blank-deposit/infrastructure/GenericVault';
import { IBlankDepositVaultState } from '@block-wallet/background/controllers/blank-deposit/infrastructure/IBlankDepositVaultState';
import { AvailableNetworks } from '@block-wallet/background/controllers/blank-deposit/types';
import { expect } from 'chai';
import sinon from 'sinon';
import mockEncryptor from '../../../mocks/mock-encryptor';

describe('GenericVault implementation', function () {
    const unlockPhrase = 'unlockPhrase';
    const lockedError = new Error('Vault locked');
    const notinitializedError = new Error('Vault not initialized');
    const alreadyinitializedError = new Error('Vault already initialized');

    const vaultContent = {
        deposits: {
            [AvailableNetworks.MAINNET]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.GOERLI]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.POLYGON]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.BSC]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.ARBITRUM]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.OPTIMISM]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.xDAI]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
            [AvailableNetworks.AVALANCHEC]: {
                deposits: [],
                errorsInitializing: [],
                isInitialized: false,
                isLoading: false,
            },
        },
        isImported: false,
    };

    let vault: GenericVault<IBlankDepositVaultState>;

    beforeEach(() => {
        vault = new GenericVault({
            initialState: '',
            encryptor: mockEncryptor,
            defaultState: vaultContent,
        });
    });
    afterEach(function () {
        sinon.restore();
    });
    describe('isInitialized', function () {
        it('Should return false', async () => {
            expect(vault.isInitialized).equal(false);
        });
        it('Should return true', async () => {
            expect(vault.isInitialized).equal(false);
            await vault.initialize(unlockPhrase);
            expect(vault.isInitialized).equal(true);
        });
    });

    describe('isUnlocked', function () {
        it('Should return false', async () => {
            expect(vault.isUnlocked).equal(false);
        });
        it('Should return true', async () => {
            await vault.initialize(unlockPhrase);
            expect(vault.isUnlocked).equal(false);
            await vault.unlock(unlockPhrase);
            expect(vault.isUnlocked).equal(true);
        });
    });

    describe('initialize', function () {
        it('initialized', async () => {
            let _e: Error | undefined = Error('');
            try {
                await vault.initialize(unlockPhrase);
                _e = undefined;
            } catch (e: any) {
                _e = e;
            } finally {
                expect(_e).to.be.undefined;
            }
        });
        it('already initialized', async () => {
            try {
                await vault.initialize(unlockPhrase);
                await vault.initialize(unlockPhrase);
            } catch (e: any) {
                expect(e.message).equal(alreadyinitializedError.message);
            }
        });
    });

    describe('lock', function () {
        it('not initialized', async () => {
            try {
                await vault.unlock(unlockPhrase);
            } catch (e: any) {
                expect(e.message).equal(notinitializedError.message);
            }
        });
        it('locked', async () => {
            await vault.initialize(unlockPhrase);
            expect(vault.isUnlocked).equal(false);
        });
        it('unlocked', async () => {
            await vault.initialize(unlockPhrase);
            expect(vault.isUnlocked).equal(false);

            await vault.unlock(unlockPhrase);
            expect(vault.isUnlocked).equal(true);
        });
    });

    describe('retrieve', function () {
        it('not initialized', async () => {
            try {
                await vault.retrieve();
            } catch (e: any) {
                expect(e.message).equal(notinitializedError.message);
            }
        });
        it('locked', async () => {
            try {
                await vault.initialize(unlockPhrase);
                await vault.retrieve();
            } catch (e: any) {
                expect(e.message).equal(lockedError.message);
            }
        });
        it('ok', async () => {
            await vault.initialize(unlockPhrase);
            await vault.unlock(unlockPhrase);

            const result = await vault.retrieve();
            expect(result).not.be.undefined;
            expect(result).not.be.null;
            expect(JSON.stringify(result)).equal(JSON.stringify(vaultContent));
        });
    });

    describe('update', function () {
        it('not initialized', async () => {
            try {
                await vault.update(vaultContent);
            } catch (e: any) {
                expect(e.message).equal(notinitializedError.message);
            }
        });
        it('locked', async () => {
            try {
                await vault.initialize(unlockPhrase);
                await vault.update(vaultContent);
            } catch (e: any) {
                expect(e.message).equal(lockedError.message);
            }
        });
        it('ok', async () => {
            await vault.initialize(unlockPhrase);
            await vault.unlock(unlockPhrase);

            const result = await vault.retrieve();
            expect(result).not.be.undefined;
            expect(result).not.be.null;
            expect(JSON.stringify(result)).equal(JSON.stringify(vaultContent));

            const customVaultContent = {
                deposits: {
                    [AvailableNetworks.MAINNET]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: true,
                    },
                    [AvailableNetworks.GOERLI]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.POLYGON]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.BSC]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.ARBITRUM]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.OPTIMISM]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.xDAI]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                    [AvailableNetworks.AVALANCHEC]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: true,
                        isLoading: false,
                    },
                },
                isImported: false,
            };
            await vault.update(customVaultContent);

            const result2 = await vault.retrieve();
            expect(result2).not.be.undefined;
            expect(result2).not.be.null;
            expect(JSON.stringify(result2)).equal(
                JSON.stringify(customVaultContent)
            );
        });
    });
});
