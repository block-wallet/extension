import PermissionsController from '@block-wallet/background/controllers/PermissionsController';
import { PreferencesController } from '@block-wallet/background/controllers/PreferencesController';
import { providerInstances } from '@block-wallet/background/infrastructure/connection';
import { expect } from 'chai';
import { mockPreferencesController } from '../mocks/mock-preferences';
import browser from 'webextension-polyfill';

describe('Permissions Controller', function () {
    chrome.runtime.id = "testid";
    const portId = '7e24f69d-c740-4eb3-9c6e-4d47df491005';

    providerInstances[portId] = {
        port: browser.runtime.connect(),
        tabId: 420,
        windowId: 404,
        origin: 'https://app.uniswap.org',
        siteMetadata: {
            iconURL: 'https://app.uniswap.org/favicon.png',
            name: 'Uniswap',
        },
    };

    const pRequests = {
        '1': {
            origin: 'https://app.uniswap.org',
            siteMetadata: {
                iconURL: 'https://app.uniswap.org/favicon.png',
                name: 'Uniswap Interface',
            },
            time: 1643997298304,
            originId: 'f34ea9f2-1f4e-4cca-a9b6-81c3ed2e4d09',
        },
        '2': {
            origin: 'https://app.compound.finance',
            siteMetadata: {
                iconURL: 'https://app.compound.finance/favicon.ico',
                name: 'Compound',
            },
            time: 1643997303652,
            originId: 'f34ea9f2-1f4e-4cca-a9b6-81c3ed2e4d09',
        },
        '3': {
            origin: 'https://app.1inch.io',
            siteMetadata: {
                iconURL:
                    'https://app.1inch.io/assets/favicon/favicon-32x32.png',
                name: '1inch - DeFi / DEX aggregator on Ethereum, Binance Smart Chain, Optimism, Polygon, Arbitrum',
            },
            time: 1643997307844,
            originId: 'f34ea9f2-1f4e-4cca-a9b6-81c3ed2e4d09',
        },
    };

    const permissions = {
        'https://app.uniswap.org': {
            accounts: [
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
            ],
            activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
            data: {
                iconURL: 'https://app.uniswap.org/favicon.png',
                name: 'Uniswap Interface',
            },
            origin: 'https://app.uniswap.org',
        },
        'https://app.compound.finance': {
            accounts: [
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
            ],
            activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
            data: {
                iconURL: 'https://app.compound.finance/favicon.ico',
                name: 'Compound',
            },
            origin: 'https://app.compound.finance',
        },
        'https://app.1inch.io': {
            accounts: [
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
            ],
            activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
            data: {
                iconURL:
                    'https://app.1inch.io/assets/favicon/favicon-32x32.png',
                name: '1inch - DeFi / DEX aggregator on Ethereum, Binance Smart Chain, Optimism, Polygon, Arbitrum',
            },
            origin: 'https://app.1inch.io',
        },
    };

    let permissionsController: PermissionsController;
    let preferencesController: PreferencesController;

    this.beforeAll(function () {
        preferencesController = mockPreferencesController;

        permissionsController = new PermissionsController(
            { permissions: {}, permissionRequests: {} },
            preferencesController
        );
    });

    this.beforeEach(function () {
        permissionsController.store.setState({
            permissions: {},
            permissionRequests: {},
        });
    });

    it('Should init properly', () => {
        const { permissions, permissionRequests } =
            permissionsController.store.getState();

        expect(permissions).to.be.empty;
        expect(permissionRequests).to.be.empty;
    });

    describe('Requests', function () {
        it('Should return permissions', async function () {
            permissionsController.store.updateState({
                permissions: { ...permissions },
            });

            const accounts = await permissionsController.connectionRequest(
                portId
            );

            expect(accounts[0]).to.be.equal(
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326'
            );
            expect(accounts[1]).to.be.undefined;
        });

        it('Should return active account', async function () {
            permissionsController.store.updateState({
                permissions: {
                    ...permissions,
                    'https://app.uniswap.org': {
                        ...permissions['https://app.uniswap.org'],
                        activeAccount:
                            '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
                    },
                },
            });

            const accounts = await permissionsController.connectionRequest(
                portId
            );

            expect(accounts[0]).to.be.equal(
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
            );
            expect(accounts[1]).to.be.undefined;
        });

        it('Should reject all requests', async function () {
            permissionsController.store.updateState({
                permissionRequests: { ...pRequests },
            });

            let reqs =
                permissionsController.store.getState().permissionRequests;

            expect(reqs).to.be.not.empty;

            for (let i = 1; i < 4; i++) {
                permissionsController['_handlers'][`${i}`] = {
                    reject: (error: Error) => { },
                    resolve: (data: any) => { },
                };
            }

            permissionsController.rejectAllRequests();

            reqs = permissionsController.store.getState().permissionRequests;

            expect(reqs).to.be.empty;
        });
    });

    describe('Accounts', function () {
        it('Should return empty array', async function () {
            const accounts = permissionsController.getAccounts(
                'https://app.uniswap.org'
            );

            expect(accounts).to.be.empty;
        });

        //removeAccount
        it('Should remove single account', function () {
            permissionsController.store.updateState({
                permissions: { ...permissions },
            });

            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;
            expect(p['https://app.uniswap.org'].accounts.length).to.be.equal(2);

            permissionsController.removeAccount(
                'https://app.uniswap.org',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
            );

            p = permissionsController.store.getState().permissions;

            expect(p['https://app.uniswap.org'].accounts.length).to.be.equal(1);
            expect(p['https://app.uniswap.org'].accounts[0]).to.be.equal(
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326'
            );
        });

        it('Should remove one specific account from all sites', function () {
            const permissions = {
                'https://app.uniswap.org': {
                    accounts: [
                        '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
                    ],
                    activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                    data: {
                        iconURL: 'https://app.uniswap.org/favicon.png',
                        name: 'Uniswap Interface',
                    },
                    origin: 'https://app.uniswap.org',
                },
                'https://app.compound.finance': {
                    accounts: [
                        '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
                    ],
                    activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                    data: {
                        iconURL: 'https://app.compound.finance/favicon.ico',
                        name: 'Compound',
                    },
                    origin: 'https://app.compound.finance',
                },
                'https://app.1inch.io': {
                    accounts: [
                        '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
                    ],
                    activeAccount: '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
                    data: {
                        iconURL:
                            'https://app.1inch.io/assets/favicon/favicon-32x32.png',
                        name: '1inch - DeFi / DEX aggregator on Ethereum, Binance Smart Chain, Optimism, Polygon, Arbitrum',
                    },
                    origin: 'https://app.1inch.io',
                },
            };

            permissionsController.store.updateState({
                permissions,
            });

            const addressToRemove =
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

            let p = permissionsController.store.getState().permissions;

            expect(p['https://app.uniswap.org'].accounts.length).to.be.equal(2);
            expect(
                p['https://app.uniswap.org'].accounts.includes(addressToRemove)
            ).to.be.true;

            expect(
                p['https://app.compound.finance'].accounts.length
            ).to.be.equal(2);
            expect(
                p['https://app.compound.finance'].accounts.includes(
                    addressToRemove
                )
            ).to.be.true;

            expect(p['https://app.1inch.io'].accounts.length).to.be.equal(2);
            expect(p['https://app.1inch.io'].accounts.includes(addressToRemove))
                .to.be.true;

            permissionsController.revokeAllPermissionsOfAccount(
                addressToRemove
            );

            p = permissionsController.store.getState().permissions;

            expect(p['https://app.uniswap.org'].accounts.length).to.be.equal(1);
            expect(
                p['https://app.uniswap.org'].accounts.includes(addressToRemove)
            ).to.be.false;

            expect(
                p['https://app.compound.finance'].accounts.length
            ).to.be.equal(1);
            expect(
                p['https://app.compound.finance'].accounts.includes(
                    addressToRemove
                )
            ).to.be.false;

            expect(p['https://app.1inch.io'].accounts.length).to.be.equal(1);
            expect(p['https://app.1inch.io'].accounts.includes(addressToRemove))
                .to.be.false;
        });

        it('Should detect wrong account', function () {
            permissionsController.store.updateState({
                permissions: { ...permissions },
            });

            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;

            expect(
                permissionsController.removeAccount.bind(
                    permissionsController,
                    'https://app.uniswap.org',
                    '0x5DD596C901987A2b28C38A9C1DfBf86fFFc15d77'
                )
            ).to.throw(
                'The account 0x5DD596C901987A2b28C38A9C1DfBf86fFFc15d77 has no permissions for this site'
            );
        });

        it('Should return account permissions', function () {
            permissionsController.store.updateState({
                permissions: { ...permissions },
            });

            const accountPermissions =
                permissionsController.getAccountPermissions(
                    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
                );

            expect(accountPermissions).to.be.not.empty;
            expect(accountPermissions).to.include(
                'https://app.compound.finance'
            );
            expect(accountPermissions).to.include('https://app.1inch.io');
        });

        it('Should detect if an account has permissions', function () {
            permissionsController.store.updateState({
                permissions: { ...permissions },
            });

            let accHasPermissions = permissionsController.accountHasPermissions(
                'https://app.compound.finance',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
            );

            expect(accHasPermissions).to.be.true;

            permissionsController.store.updateState({
                permissions: {},
            });

            accHasPermissions = permissionsController.accountHasPermissions(
                'https://app.compound.finance',
                '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
            );

            expect(accHasPermissions).to.be.false;
        });
    });

    describe('Sites', function () {
        it('Should add a new permission', function () {
            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.empty;

            permissionsController.addNewSite(
                'https://app.uniswap.org',
                {
                    iconURL: 'https://app.uniswap.org/favicon.png',
                    name: 'Uniswap Interface',
                },
                ['0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326']
            );

            p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;
            expect(p['https://app.uniswap.org']).to.be.not.undefined;
        });

        it('Should not add same origin permission', function () {
            permissionsController.store.setState({
                permissions: { ...permissions },
                permissionRequests: {},
            });

            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;

            expect(
                permissionsController.addNewSite.bind(
                    permissionsController,
                    'https://app.uniswap.org',
                    {
                        iconURL: 'https://app.uniswap.org/favicon.png',
                        name: 'Uniswap Interface',
                    },
                    ['0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326']
                )
            ).to.throw('https://app.uniswap.org is already logged');
        });

        it('Should update site permissions', function () {
            permissionsController.store.setState({
                permissions: { ...permissions },
                permissionRequests: {},
            });

            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;

            permissionsController.updateSite('https://app.uniswap.org', [
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326',
            ]);

            p = permissionsController.store.getState().permissions;

            expect(p['https://app.uniswap.org'].accounts.length).to.be.equal(1);
            expect(p['https://app.uniswap.org'].accounts[0]).to.be.equal(
                '0x21b9aDD3E64C99A9291e2D7De24be8f569D5B326'
            );
        });

        it('Should remove site permissions', function () {
            permissionsController.store.setState({
                permissions: { ...permissions },
                permissionRequests: {},
            });

            let p = permissionsController.store.getState().permissions;

            expect(p).to.be.not.empty;

            permissionsController.updateSite('https://app.uniswap.org', null);

            p = permissionsController.store.getState().permissions;

            expect(p['https://app.uniswap.org']).to.be.undefined;
        });

        it('Should return permissions for a site', function () {
            permissionsController.store.setState({
                permissions: { ...permissions },
                permissionRequests: {},
            });

            let sitePermissions = permissionsController.getSitePermissions(
                'https://app.uniswap.org'
            );

            expect(sitePermissions).to.be.not.empty;

            permissionsController.store.updateState({
                permissions: {},
            });

            sitePermissions = permissionsController.getSitePermissions(
                'https://app.uniswap.org'
            );

            expect(sitePermissions).to.be.null;
        });
    });
});
