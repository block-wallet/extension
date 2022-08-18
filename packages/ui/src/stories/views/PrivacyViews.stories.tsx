import { Meta } from "@storybook/react"
import { MockPopup } from "../../mock/MockApp"
import { initBackgroundState } from "../../mock/MockBackgroundState"
export const Privacy = () => (
    <MockPopup
        location={`/privacy`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const Deposit = () => <MockPopup location={`/privacy/deposit`} />
export const Withdraw = () => (
    <MockPopup
        location={`/privacy/withdraw`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export default { title: "Privacy Views" } as Meta
