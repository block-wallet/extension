import { expect } from 'chai';
import NetworkController from '../../src/controllers/NetworkController';
import { EnsController } from '../../src/controllers/EnsController';
import { getNetworkControllerInstance } from '../mocks/mock-network-instance';

const blankEnsGoerliAddress = '0xe557E465F0dC51295573C7f6494dA9341f2E4a81';
const blankEnsGoerliName = 'blankgoerli.eth';
describe('ENS Controller', function () {
    let networkController: NetworkController;
    let ensController: EnsController;

    beforeEach(function () {
        networkController = getNetworkControllerInstance();
        ensController = new EnsController({
            networkController: networkController,
        });
    });

    it('should resolve ENS name properly', async function () {
        const resolvedAddress = await ensController.resolveName(
            blankEnsGoerliName
        );

        expect(resolvedAddress).to.be.equal(blankEnsGoerliAddress);
    });

    it('should lookup address properly', async function () {
        const resolvedAddress = await ensController.lookupAddress(
            blankEnsGoerliAddress
        );

        expect(resolvedAddress).to.be.equal(blankEnsGoerliName);
    }).timeout(10000);

    it('should return null when unset ENS name is tried to be resolved', async function () {
        const resolvedAddress = await ensController.resolveName(
            'unsetunsetunsetoo.eth'
        );

        expect(resolvedAddress).to.be.equal(null);
    });

    it('should return null when unset address is looked up', async function () {
        const lookedupAddress = await ensController.lookupAddress(
            '0x0000000000000000000000000000000000000000'
        );

        expect(lookedupAddress).to.be.equal(null);
    });
});
