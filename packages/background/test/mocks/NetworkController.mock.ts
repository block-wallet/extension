import sinon from 'sinon';
import { getNetworkControllerInstance } from './mock-network-instance';
import MockProvider from './mock-provider';

export default () => {
    const mockedNetworkController = getNetworkControllerInstance();

    const mockedProvider = MockProvider('goerli');

    sinon
        .stub(mockedNetworkController, 'getProvider')
        .callsFake(() => mockedProvider);

    return {
        mockedNetworkController: mockedNetworkController,
        mockedProvider,
    };
};
