import { StaticJsonRpcProvider } from '@ethersproject/providers';
import sinon, { SinonSandbox, SinonStatic } from 'sinon';
import { INITIAL_NETWORKS } from '../../src/utils/constants/networks';

const MockProvider = (
    network: string,
    sandbox: SinonStatic | SinonSandbox = sinon
) => {
    const mockedProvider = sandbox.stub(StaticJsonRpcProvider.prototype);

    const _network = network || 'homestead';
    const mayusNetwork = _network.toUpperCase();
    if (!(mayusNetwork in INITIAL_NETWORKS)) {
        throw new Error('invalid network');
    }

    const chainId = (INITIAL_NETWORKS as any)[mayusNetwork].chainId;

    mockedProvider.getNetwork.callsFake(() => {
        return Promise.resolve({
            name: _network,
            chainId,
        });
    });

    mockedProvider.send.callsFake((method) => {
        if (method === 'eth_chainId') {
            return chainId;
        }
        return Promise.resolve(true);
    });

    return mockedProvider;
};

export default MockProvider;
