import { BaseController } from '../infrastructure/BaseController';
import { AccountTrackerController } from './AccountTrackerController';
import httpClient from '../utils/http';

const CAMPAIGNS_SERVICE_URL = 'https://campaigns.blockwallet.io/v1';

export interface CampaignsControllerState {
    enrollments: {
        [campaingId: string]: {
            isEnrolled: boolean;
            accountAddress: string;
        };
    };
}

const toLower = (a: string) => a.toLowerCase();

export default class CampaignsController extends BaseController<
    CampaignsControllerState,
    undefined
> {
    constructor(
        private _accountTrackerController: AccountTrackerController,
        initialState?: CampaignsControllerState
    ) {
        super(initialState || { enrollments: {} });
    }

    public async isEnrolled(campaignId: string): Promise<boolean> {
        const { enrollments } = this.store.getState();
        const campaignEnrollments = enrollments[campaignId];
        if (campaignEnrollments && campaignEnrollments.isEnrolled) {
            return true;
        }

        const accountAddresses = this._accountTrackerController
            .getAllAccountAddresses()
            .map(toLower);

        const enrolledAccounts = await httpClient.request<{
            accounts: string[];
        }>(`${CAMPAIGNS_SERVICE_URL}/api/campaigns/${campaignId}/accounts`);

        const enrolledAccount = enrolledAccounts.accounts.find((acc) =>
            accountAddresses.includes(acc.toLowerCase())
        );

        if (enrolledAccount) {
            this.store.updateState({
                enrollments: {
                    ...this.store.getState().enrollments,
                    [campaignId]: {
                        isEnrolled: true,
                        accountAddress: enrolledAccount,
                    },
                },
            });
        }

        return !!enrolledAccount;
    }
}
