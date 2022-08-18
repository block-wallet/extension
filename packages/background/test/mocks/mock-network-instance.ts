import NetworkController, {
    NetworkControllerState,
} from '@block-wallet/background/controllers/NetworkController';
import { INITIAL_NETWORKS } from '@block-wallet/background/utils/constants/networks';

const initialNetworkControllerState: NetworkControllerState = {
    selectedNetwork: 'goerli',
    availableNetworks: INITIAL_NETWORKS,
    isNetworkChanging: false,
    isUserNetworkOnline: true,
    isProviderNetworkOnline: true,
    isEIP1559Compatible: {},
};

const getNetworkControllerInstance = () =>
    new NetworkController(initialNetworkControllerState);

export { getNetworkControllerInstance, initialNetworkControllerState };
