import { addNetworkUsingValuesDefinedByTheUser } from '@block-wallet/background/utils/networks';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';
import initialState from '@block-wallet/background/utils/constants/initialState';
import NetworkController from '@block-wallet/background/controllers/NetworkController';
import { expect } from 'chai';

describe('Add network with previous values', () => {
    const networkController = new NetworkController(
        initialState.NetworkController
    );

    it('should add a new network because it does not exist', () => {
        const networks = { ...INITIAL_NETWORKS };
        const newNetwork = INITIAL_NETWORKS.RSK;
        const networkName = 'RSK';
        delete networks[networkName];

        const chainIdKey = networkController.getNonNativeNetworkKey(
            INITIAL_NETWORKS.RSK.chainId
        );

        const updatedNetworks = addNetworkUsingValuesDefinedByTheUser(
            networkName,
            chainIdKey,
            newNetwork,
            networks
        );

        expect(updatedNetworks[chainIdKey]).undefined;
        expect(updatedNetworks).to.deep.eq(networks);
        expect(updatedNetworks.RSK).to.deep.eq(INITIAL_NETWORKS.RSK);
    });
    it('should update the "new" network because it was already added', () => {
        const networks = { ...INITIAL_NETWORKS };
        const newNetwork = { ...INITIAL_NETWORKS.RSK };
        const networkName = 'RSK';
        const valuesUpdatedByTheUser = {
            blockExplorerUrls: ['https://explorer.com'], // should not be replaced
            desc: 'CUSTOM', // should not be replaced
            order: 15, // should not be replaced
            rpcUrls: ['https://rpc.com'], // should be replaced
            nativeCurrency: {
                name: 'Testnet Smart Bitcoin',
                symbol: 'CUSTOM', // should be replaced
                decimals: 18,
            },
        };
        const chainIdKey = networkController.getNonNativeNetworkKey(
            INITIAL_NETWORKS.RSK.chainId
        );
        networks[chainIdKey] = { ...networks.RSK, ...valuesUpdatedByTheUser };
        delete networks[networkName];

        const updatedNetworks = addNetworkUsingValuesDefinedByTheUser(
            networkName,
            chainIdKey,
            newNetwork,
            { ...networks }
        );

        expect(updatedNetworks[chainIdKey]).undefined;

        expect(updatedNetworks.RSK.rpcUrls).not.to.eq(
            valuesUpdatedByTheUser.rpcUrls
        );
        expect(updatedNetworks.RSK.rpcUrls).to.eq(newNetwork.rpcUrls);

        expect(updatedNetworks.RSK.nativeCurrency.symbol).to.eq(
            newNetwork.nativeCurrency.symbol
        );

        expect(updatedNetworks.RSK.blockExplorerUrls).not.to.deep.eq(
            newNetwork.blockExplorerUrls
        );

        expect(updatedNetworks.RSK.blockExplorerUrls).to.deep.eq(
            valuesUpdatedByTheUser.blockExplorerUrls
        );

        expect(updatedNetworks.RSK.desc).not.to.eq(newNetwork.desc);
        expect(updatedNetworks.RSK.desc).to.eq(valuesUpdatedByTheUser.desc);

        expect(updatedNetworks.RSK.order).not.to.eq(newNetwork.order);
        expect(updatedNetworks.RSK.order).to.eq(valuesUpdatedByTheUser.order);
    });
});
