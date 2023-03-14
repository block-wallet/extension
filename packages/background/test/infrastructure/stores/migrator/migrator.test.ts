import sinon from 'sinon';
import { BigNumber } from '@ethersproject/bignumber';
import { BlankAppState } from '../../../../src/utils/constants/initialState';
import { migrator } from '../../../../src/infrastructure/stores/migrator/migrator';
import { DeepPartial } from '../../../../src/utils/types/helpers';
import * as migrations from '../../../../src/infrastructure/stores/migrator/migrations';
import { IMigration } from '@block-wallet/background/infrastructure/stores/migrator/IMigration';
import { expect } from 'chai';
import { lt, lte, valid } from 'semver';
import { version } from '../../../../package.json';
import { sha256 } from '@ethersproject/sha2';

describe('Migrations integrity', () => {
    it('package version integrity', () => {
        expect(!!valid(version), 'package json version must be a valid semver')
            .to.be.true;
    });

    it('semver version integrity', () => {
        const allMigrations: IMigration[] = migrations.default();

        const invalidVersionMigrations = allMigrations.filter(
            (migration: IMigration) => !valid(migration.version)
        );

        expect(
            invalidVersionMigrations,
            'some migrations have an invalid version'
        ).to.be.empty;
    });

    it('migrations are sorted by version', () => {
        const allMigrations: IMigration[] = migrations.default();

        for (let i = 0; i < allMigrations.length - 1; i++) {
            const a = allMigrations[i];
            const b = allMigrations[i + 1];
            expect(
                lt(a.version, b.version),
                'migrations should be ordered by version'
            ).to.be.true;
        }
    });

    it('last migration version has to be lower than the package version', () => {
        const allMigrations: IMigration[] = migrations.default();

        const newer = allMigrations.sort((a: IMigration, b: IMigration) =>
            lt(a.version, b.version) ? 1 : -1
        )[0];

        expect(
            lte(newer.version, version),
            'package version must be greater or equal than the newest migration'
        ).to.be.true;
    });

    it('no duplicated migrations', () => {
        const allMigrations: IMigration[] = migrations.default();

        const repeatedMigrations = allMigrations.some(
            (a: IMigration, i: number, allMigrations) => {
                return allMigrations.some((b: IMigration, j: number) => {
                    return (
                        i !== j &&
                        sha256(Buffer.from(a.migrate.toString())) ===
                            sha256(Buffer.from(b.migrate.toString()))
                    );
                });
            }
        );

        expect(
            repeatedMigrations,
            'a migration is listed twice or the migrate function is duplicated in 2 or more migrations'
        ).to.be.false;
    });

    it('all the migrations are being used', () => {
        const implementedMigrationsCount = migrations.default().length;
        let currentMigrations = 0;

        for (let i = 0; ; i++) {
            const currentIndex = i + 1;
            const twoPositionsIndex =
                currentIndex < 10
                    ? '0' + currentIndex.toString()
                    : currentIndex.toString();

            try {
                const migration = require(`../../../../src/infrastructure/stores/migrator/migrations/migration-${twoPositionsIndex}`);
                if (!migration) {
                    throw new Error(
                        `migration-${twoPositionsIndex} does not exist`
                    );
                }
            } catch (e: any) {
                currentMigrations = i;
                break;
            }
        }

        expect(
            implementedMigrationsCount,
            'the number of migrations is different from the number of implemented migrations'
        ).to.be.equal(currentMigrations);
    });
});

describe('State Migrator', () => {
    const persistedState: DeepPartial<BlankAppState> = {
        AccountTrackerController: {
            isAccountTrackerLoading: false,
            accounts: {
                '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb': {
                    address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                    balances: {},
                    name: 'Account1',
                },

                '0xd7d4e99b3e796a528590f5f6b84c2b2f967e7ccb': {
                    address: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
                    balances: {},
                    name: 'Account2',
                },
            },
        },
        AppStateController: {},
        BlankDepositController: {
            pendingWithdrawals: {
                goerli: { pending: [] },
                mainnet: { pending: [] },
            },
            vaultState: {
                vault: 'encrypted-deposits-vault',
            },
        },
        ExchangeRatesController: { exchangeRates: { ETH: 2786.23, USDT: 1 } },
        GasPricesController: {
            gasPriceData: {
                5: {
                    gasPricesLevels: {
                        average: { gasPrice: BigNumber.from('2000000000') },
                        fast: { gasPrice: BigNumber.from('2000000000') },
                        slow: { gasPrice: BigNumber.from('2000000000') },
                    },
                },
            },
        },
        KeyringController: {
            isUnlocked: false,
            keyringTypes: {},
            keyrings: [],
            vault: 'encrypted-vault',
        },
        OnboardingController: {
            isOnboarded: true,
            isSeedPhraseBackedUp: false,
        },
        PreferencesController: {
            localeInfo: 'en-GB',
            nativeCurrency: 'GBP',
            selectedAddress: '0x72fd102eb412de8415ca9a89c0c2a5bd2ecfbdfb',
        },
        TransactionController: { transactions: [] },
        TokenController: {
            userTokens: {} as any,
            deletedUserTokens: {} as any,
        },
    };

    const stubbedFirstMigration = sinon
        .stub()
        .callsFake((persistedState: BlankAppState) => persistedState);

    const stubbedSecondMigration = sinon.stub().callsFake(
        sinon.stub().callsFake(async (persistedState: BlankAppState) => {
            const { accounts } = persistedState.AccountTrackerController;
            const updatedAccounts = {} as typeof accounts;
            for (const [address, values] of Object.entries(accounts)) {
                updatedAccounts[address] = {
                    ...values,
                    balances: {},
                };
            }

            return {
                ...persistedState,
                AccountTrackerController: {
                    isAccountTrackerLoading: false,
                    accounts: updatedAccounts,
                },
            };
        })
    );

    const mockedMigrations: IMigration[] = [
        {
            migrate: stubbedFirstMigration,
            version: '0.0.9',
        },
        {
            migrate: stubbedSecondMigration,
            version: '0.2.0',
        },
    ];

    it('Should run the mocked migrations correctly and skip the already persisted', async () => {
        const version = '0.1.0';

        sinon.stub(migrations, 'default').returns(mockedMigrations);
        const newState = await migrator(version, persistedState);

        const originalAccounts = Object.values(
            persistedState.AccountTrackerController!.accounts!
        );

        Object.values(newState.AccountTrackerController.accounts).forEach(
            (account, i) => {
                expect(account).to.have.property('balances').that.is.empty;

                expect(account)
                    .to.have.property('address')
                    .that.is.equal(originalAccounts[i]!.address);

                expect(account)
                    .to.have.property('name')
                    .that.is.equal(originalAccounts[i]!.name);

                expect(account)
                    .to.have.property('balances')
                    .that.is.deep.equal(originalAccounts[i]!.balances);
            }
        );

        expect(newState).to.be.deep.equal({
            ...(persistedState as BlankAppState),
            AccountTrackerController: newState.AccountTrackerController,
        });

        expect(stubbedFirstMigration.notCalled).to.be.true;
        expect(stubbedSecondMigration.calledOnceWith(persistedState)).to.be
            .true;
        sinon.restore();
    });
});

// Check tests
// Checl tornado
