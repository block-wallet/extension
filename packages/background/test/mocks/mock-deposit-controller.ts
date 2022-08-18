import sinon from 'sinon';
import { BlankDepositController } from '../../src/controllers/blank-deposit/BlankDepositController';

export type StubbedClass<BlankDepositController> =
    sinon.SinonStubbedInstance<BlankDepositController> & BlankDepositController;

const MockDepositController = () => {
    const mockedDepositController = sinon.stub(
        BlankDepositController.prototype
    );

    mockedDepositController.initialize.callsFake(() => Promise.resolve());
    mockedDepositController.unlock.callsFake(
        (password: string, mnemonic: string) => Promise.resolve()
    );

    sinon.stub(mockedDepositController, 'UIStore').get(() => ({
        subscribe: () => {},
        getState: () => ({
            isImportingDeposits: false,
        }),
    }));

    return mockedDepositController as unknown as StubbedClass<BlankDepositController>;
};

export default MockDepositController;
