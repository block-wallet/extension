import { Contract } from '@ethersproject/contracts';

export enum TornadoEvents {
    DEPOSIT = 'Deposit',
    WITHDRAWAL = 'Withdrawal',
}

export const TornadoEventsTopics: { [event in TornadoEvents]: string } = {
    Deposit:
        '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
    Withdrawal:
        '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
};

export interface ITornadoContract extends Contract {
    isSpent(nullifierHex: string): Promise<boolean>;
    isKnownRoot(rootHex: string): Promise<boolean>;
}
