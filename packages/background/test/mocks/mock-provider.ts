import { ethers } from 'ethers';
import sinon from 'sinon';
import { INITIAL_NETWORKS } from '../../src/utils/constants/networks';

const MockProvider = (network: string) => {
    const mockedProvider = sinon.stub(
        ethers.providers.StaticJsonRpcProvider.prototype
    );

    const _network = network || 'homestead';
    const mayusNetwork = _network.toUpperCase();
    if (!(mayusNetwork in INITIAL_NETWORKS)) {
        throw new Error('invalid network');
    }

    mockedProvider.getNetwork.callsFake(() =>
        Promise.resolve({
            name: _network,
            chainId: (INITIAL_NETWORKS as any)[mayusNetwork].chainId,
        })
    );

    mockedProvider._network = {
        name: _network,
        chainId: (INITIAL_NETWORKS as any)[mayusNetwork].chainId,
    };

    return mockedProvider;
};

export default MockProvider;
