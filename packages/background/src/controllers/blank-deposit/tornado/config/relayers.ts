import { AvailableNetworks } from '../../types';

const relayers: { [network in AvailableNetworks]: string } = {
    goerli: 'goerli-relayer.blockwallet.io',
    mainnet: 'mainnet-relayer.blockwallet.io',
    bsc: 'bsc-relayer.blockwallet.io',
    polygon: 'polygon-relayer.blockwallet.io',
    arbitrum: '',
    avalanchec: '',
    optimism: '',
    xdai: '',
};

export default relayers;
