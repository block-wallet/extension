import NetworkController, {
    NetworkControllerState,
} from '@block-wallet/background/controllers/NetworkController';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';

const initialNetworkControllerState: NetworkControllerState = {
    selectedNetwork: 'goerli',
    availableNetworks: INITIAL_NETWORKS,
    isNetworkChanging: false,
    isUserNetworkOnline: true,
    providerStatus: {
        isCurrentProviderOnline: true,
        isDefaultProviderOnline: true,
        isBackupProviderOnline: true,
        isUsingBackupProvider: false,
    },
    isEIP1559Compatible: {},
};

const getNetworkControllerInstance = (selectedNetwork: string = 'goerli') =>
    new NetworkController({
        ...initialNetworkControllerState,
        selectedNetwork,
    });

export { getNetworkControllerInstance, initialNetworkControllerState };
