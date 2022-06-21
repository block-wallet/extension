import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { Flatten } from "@block-wallet/background/utils/types/helpers"
import { BlankAppUIState } from "@block-wallet/background/utils/constants/initialState"

export const getCurrentAccount = (state: Flatten<BlankAppUIState>) =>
    state.accounts[
        state.selectedAddress.length > 0
            ? state.selectedAddress
            : Object.keys(state.accounts)[0]
    ] as AccountInfo
