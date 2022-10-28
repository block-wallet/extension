import sinon from 'sinon';
import { expect } from 'chai';
import KeyringControllerDerivated, {
    KeyringTypes,
} from '@block-wallet/background/controllers/KeyringControllerDerivated';
import KeyringController from 'eth-keyring-controller';
import mockEncryptor from 'test/mocks/mock-encryptor';

describe('KeyringControllerDerivated', () => {
    const MOCK_PASSWORD = 'passoword';
    let keyringControllerDerivated: KeyringControllerDerivated;

    beforeEach(async () => {
        keyringControllerDerivated = new KeyringControllerDerivated({
            initState: {
                isUnlocked: false,
                keyringTypes: {},
                keyrings: [],
                vault: '',
            },
            encryptor: mockEncryptor,
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('verifyAccounts', async () => {
        it('no keyring', async () => {
            sinon
                .stub(KeyringController.prototype, 'getKeyringsByType')
                .returns([]);

            try {
                await (keyringControllerDerivated as any)['verifyAccounts']();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('No HD Key Tree found');
            }
        });

        it('no accounts', async () => {
            const keyTree = {
                serialize: () => {
                    return {
                        mnemonic: '',
                    };
                },
                getAccounts: () => {
                    return new Promise((resolve) => {
                        resolve([]);
                    });
                },
            };

            sinon
                .stub(KeyringController.prototype, 'getKeyringsByType')
                .returns([keyTree]);

            try {
                await (keyringControllerDerivated as any)['verifyAccounts']();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('No accounts found');
            }
        });

        it('wrong number of accounts', async () => {
            const keyTree = {
                serialize: () => {
                    return {
                        mnemonic: '',
                    };
                },
                getAccounts: () => {
                    return new Promise((resolve) => {
                        resolve(['0x0']);
                    });
                },
            };
            class mockKeyTree {
                constructor() {}
                serialize = () => {
                    return {
                        mnemonic: '',
                    };
                };
                getAccounts = () => {
                    return new Promise((resolve) => {
                        resolve(['0x0', '0x1']);
                    });
                };
            }

            sinon
                .stub(KeyringController.prototype, 'getKeyringsByType')
                .returns([keyTree]);

            sinon
                .stub(KeyringController.prototype, 'getKeyringClassForType')
                .returns(mockKeyTree);

            try {
                await (keyringControllerDerivated as any)['verifyAccounts']();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('Wrong number of accounts');
            }
        });

        it('different accounts', async () => {
            const keyTree = {
                serialize: () => {
                    return {
                        mnemonic: '',
                    };
                },
                getAccounts: () => {
                    return new Promise((resolve) => {
                        resolve(['0x0', '0x1']);
                    });
                },
            };
            class mockKeyTree {
                constructor() {}
                serialize = () => {
                    return {
                        mnemonic: '',
                    };
                };
                getAccounts = () => {
                    return new Promise((resolve) => {
                        resolve(['0x0', '0x2']);
                    });
                };
            }

            sinon
                .stub(KeyringController.prototype, 'getKeyringsByType')
                .returns([keyTree]);

            sinon
                .stub(KeyringController.prototype, 'getKeyringClassForType')
                .returns(mockKeyTree);

            try {
                await (keyringControllerDerivated as any)['verifyAccounts']();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal(
                    'Not identical accounts! Original: 0x1, Restored: 0x2'
                );
            }
        });

        it('working ok', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );
            await (keyringControllerDerivated as any)['verifyAccounts']();
            expect(true).equal(true);
        });
    });

    describe('createNewVaultAndKeychain', async () => {
        it('first creation', async () => {
            const vault =
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );

            expect(vault).not.equal(undefined);
            expect(vault.keyrings).not.equal(undefined);
            expect(vault.keyrings.length).equal(1);
            expect(vault.keyrings[0].type).equal(KeyringTypes.HD_KEY_TREE);
        });

        it('re creation', async () => {
            let vault =
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );

            expect(vault).not.equal(undefined);
            expect(vault.keyrings).not.equal(undefined);
            expect(vault.keyrings.length).equal(1);
            expect(vault.keyrings[0].type).equal(KeyringTypes.HD_KEY_TREE);

            vault = await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            expect(vault).not.equal(undefined);
            expect(vault.keyrings).not.equal(undefined);
            expect(vault.keyrings.length).equal(1);
            expect(vault.keyrings[0].type).equal(KeyringTypes.HD_KEY_TREE);
        });
    });

    describe('createNewVaultAndRestore', async () => {
        it('create a new vault', async () => {
            const originalVault =
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );
            expect(originalVault).not.equal(undefined);

            const originalSeed =
                await keyringControllerDerivated.verifySeedPhrase(
                    MOCK_PASSWORD
                );
            expect(originalSeed).not.equal(undefined);
            expect(originalSeed).not.equal('');

            const newVault =
                await keyringControllerDerivated.createNewVaultAndRestore(
                    MOCK_PASSWORD,
                    originalSeed
                );
            expect(newVault).not.equal(undefined);

            const newSeed = await keyringControllerDerivated.verifySeedPhrase(
                MOCK_PASSWORD
            );
            expect(newSeed).not.equal(undefined);
            expect(newSeed).not.equal('');
            expect(newSeed).equal(originalSeed);
        });

        it('the created accounts should be "deleted"', async () => {
            const originalVault =
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );
            expect(originalVault).not.equal(undefined);

            const account2 = await keyringControllerDerivated.createAccount();
            const account3 = await keyringControllerDerivated.createAccount();
            const account4 = await keyringControllerDerivated.createAccount();

            const accounts = await keyringControllerDerivated.getAccounts();
            expect(accounts.length).equal(4);
            expect(accounts[1]).equal(account2);
            expect(accounts[2]).equal(account3);
            expect(accounts[3]).equal(account4);

            const seed = await keyringControllerDerivated.verifySeedPhrase(
                MOCK_PASSWORD
            );

            const newVault =
                await keyringControllerDerivated.createNewVaultAndRestore(
                    MOCK_PASSWORD,
                    seed
                );
            expect(newVault).not.equal(undefined);

            const newAccounts = await keyringControllerDerivated.getAccounts();
            expect(newAccounts.length).equal(1);
        });
    });

    describe('submitPassword', async () => {
        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('incorrect password', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            await keyringControllerDerivated.setLocked();

            sinon.stub(mockEncryptor, 'decrypt').returns(
                new Promise((_, reject) => {
                    reject('Incorrect password');
                })
            );

            try {
                await keyringControllerDerivated.submitPassword('other');
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e).equal('Incorrect password');
            }
        });

        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('correct password', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            await keyringControllerDerivated.setLocked();

            await keyringControllerDerivated.submitPassword(MOCK_PASSWORD);
            expect(true).equal(true);
        });
    });

    describe('verifyPassword', async () => {
        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('incorrect password', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            await keyringControllerDerivated.setLocked();

            sinon.stub(mockEncryptor, 'decrypt').returns(
                new Promise((_, reject) => {
                    reject('Incorrect password');
                })
            );

            try {
                await keyringControllerDerivated.verifyPassword('other');
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e).equal('Incorrect password');
            }
        });

        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('correct password', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            await keyringControllerDerivated.setLocked();

            await keyringControllerDerivated.verifyPassword(MOCK_PASSWORD);
            expect(true).equal(true);
        });
    });

    describe('verifySeedPhrase', async () => {
        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('the retrieved seed phrase is correct', async () => {
            const vault =
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );

            const seedPhrase =
                await keyringControllerDerivated.verifySeedPhrase(
                    MOCK_PASSWORD
                );
            expect(seedPhrase).not.equal('');

            const primaryKeyring = keyringControllerDerivated.getKeyringsByType(
                vault.keyrings[0].type
            )[0];

            const seedPhraseToCheck = await (
                keyringControllerDerivated as any
            ).getMnemonicFromKeyring(primaryKeyring);
            expect(seedPhraseToCheck).not.equal('');

            expect(seedPhraseToCheck).equal(seedPhrase);
        });
    });

    describe('createAccount', async () => {
        it('no keyring 1', async () => {
            sinon
                .stub(KeyringController.prototype, 'getKeyringsByType')
                .returns([]);

            try {
                await keyringControllerDerivated.createAccount();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('No HD Key Tree found');
            }
        });
        it('no keyring 2 ', async () => {
            try {
                await keyringControllerDerivated.createAccount();
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('No HD Key Tree found');
            }
        });
        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('adding 3 accounts', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            let accounts = await keyringControllerDerivated.getAccounts();
            expect(accounts.length).equal(1);
            expect(accounts[0]).not.equal('');

            const account2 = await keyringControllerDerivated.createAccount();
            expect(account2).not.equal('');
            const account3 = await keyringControllerDerivated.createAccount();
            expect(account3).not.equal('');
            const account4 = await keyringControllerDerivated.createAccount();
            expect(account4).not.equal('');

            accounts = await keyringControllerDerivated.getAccounts();
            expect(accounts.length).equal(4);
            expect(accounts[1]).equal(account2);
            expect(accounts[2]).equal(account3);
            expect(accounts[3]).equal(account4);

            for (let i = 0; i < accounts.length; i++) {
                for (let j = 0; j < accounts.length; j++) {
                    if (i !== j) {
                        expect(accounts[i]).not.equal(accounts[j]);
                    }
                }
            }
        });
    });

    describe('importAccount', async () => {
        it('no keyring', async () => {
            try {
                await keyringControllerDerivated.importAccount('secret');
                expect('This should').equal('not happend');
            } catch (e) {
                expect(e.message).equal('No HD Key Tree found');
            }
        });
        it('invalid secret', async () => {
            try {
                await keyringControllerDerivated.createNewVaultAndKeychain(
                    MOCK_PASSWORD
                );

                await keyringControllerDerivated.importAccount('');

                expect('This should').equal('not happend');
            } catch (e) {
                expect(e).not.equal(undefined);
            }
        });
        // TODO(REC): check error on runner -> InvalidCharacterError: The string to be decoded contains invalid characters.
        it.skip('a new account', async () => {
            await keyringControllerDerivated.createNewVaultAndKeychain(
                MOCK_PASSWORD
            );

            const account = await keyringControllerDerivated.importAccount(
                '712271778f663c8149f3249909ece9966ab1a99e23ae23b4c32b32232a62af8e'
            );

            expect(account).not.equal('');
        });
    });
});
