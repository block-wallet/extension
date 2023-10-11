import AppStateController from '../../src/controllers/AppStateController';
import { mockKeyringController } from '../mocks/mock-keyring-controller';
import { expect } from 'chai';
import TransactionController from '@block-wallet/background/controllers/transactions/TransactionController';
import { TypedTransaction } from '@ethereumjs/tx';
import { getNetworkControllerInstance } from 'test/mocks/mock-network-instance';
import { mockPreferencesController } from 'test/mocks/mock-preferences';
import { mockedPermissionsController } from 'test/mocks/mock-permissions';
import { GasPricesController } from '@block-wallet/background/controllers/GasPricesController';
import initialState from '@block-wallet/background/utils/constants/initialState';
import BlockUpdatesController from '@block-wallet/background/controllers/block-updates/BlockUpdatesController';
import BlockFetchController from '@block-wallet/background/controllers/block-updates/BlockFetchController';
import {
    TokenController,
    TokenControllerProps,
} from '@block-wallet/background/controllers/erc-20/TokenController';
import { TokenOperationsController } from '@block-wallet/background/controllers/erc-20/transactions/TokenOperationsController';
import { sleep } from '@block-wallet/background/utils/sleep';
import * as ManifestUtils from '@block-wallet/background/utils/manifest';
import sinon from 'sinon';




describe('AppState Controller', function () {
    let appStateController: AppStateController;
    const defaultIdleTimeout = 5;

    this.beforeAll(function () {
        sinon.stub(ManifestUtils, 'isManifestV3').returns(false)

        const networkController = getNetworkControllerInstance();
        const preferencesController = mockPreferencesController;
        const permissionsController = mockedPermissionsController;
        const blockUpdatesController = new BlockUpdatesController(
            networkController,
            new BlockFetchController(networkController, {
                blockFetchData: {},
            }),
            { blockData: {} }
        );
        const tokenController = new TokenController(
            {
                userTokens: {} as any,
                deletedUserTokens: {} as any,
                cachedPopulatedTokens: {} as any,
            },
            {
                networkController,
                preferencesController,
                tokenOperationsController: new TokenOperationsController({
                    networkController: networkController,
                }),
            } as TokenControllerProps
        );
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

        appStateController = new AppStateController(
            {
                idleTimeout: defaultIdleTimeout,
                isAppUnlocked: true,
                lastActiveTime: new Date().getTime(),
                lockedByTimeout: false,
            },
            mockKeyringController,
            new TransactionController(
                networkController,
                preferencesController,
                permissionsController,
                new GasPricesController(
                    networkController,
                    blockUpdatesController,
                    initialState.GasPricesController
                ),
                tokenController,
                blockUpdatesController,
                mockKeyringController,
                {
                    transactions: [],
                    txSignTimeout: 0,
                },
                async (_: string, ethTx: TypedTransaction) => {
                    const privateKey = Buffer.from(
                        accounts.goerli[0].key,
                        'hex'
                    );
                    return Promise.resolve(ethTx.sign(privateKey));
                },
                { txHistoryLimit: 40 }
            )
        );

    });

    this.afterAll(function () {
        sinon.restore();
    });

    it('should update the last user active time', async function () {
        const initialTime = appStateController.store.getState().lastActiveTime;
        expect(initialTime).to.be.greaterThan(0);
        const promise = await sleep(600);
        appStateController.setLastActiveTime();
        expect(
            appStateController.store.getState().lastActiveTime
        ).to.be.greaterThan(initialTime);
    });

    it('should lock and unlock properly', async function () {
        await mockKeyringController.createNewVaultAndKeychain('testPassword');
        await appStateController.lock();
        expect(appStateController.store.getState().isAppUnlocked).to.be.false;

        await appStateController.unlock('testPassword');
        expect(appStateController.store.getState().isAppUnlocked).to.be.true;

        await appStateController.lock();
        expect(appStateController.store.getState().isAppUnlocked).to.be.false;

        await appStateController.unlock('testPassword');
        expect(appStateController.store.getState().isAppUnlocked).to.be.true;
    });

    it('should set a custom auto block timeout', async function () {
        expect(appStateController.store.getState().idleTimeout).equal(
            defaultIdleTimeout
        );

        appStateController.setIdleTimeout(4);

        expect(appStateController.store.getState().idleTimeout).equal(4);
    });

    it('should auto lock the app', function (done) {
        // Set idle timeout to 600 ms
        appStateController.setIdleTimeout(0.01);

        expect(appStateController.store.getState().isAppUnlocked).to.be.true;

        window.setTimeout(function () {
            expect(
                appStateController.store.getState().isAppUnlocked
            ).to.be.false;
            done();
        }, 1000);
    });
});
