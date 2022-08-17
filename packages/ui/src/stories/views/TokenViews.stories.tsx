import { Meta } from "@storybook/react"
import { MockPopup } from "../../mock/MockApp"
import { initBackgroundState } from "../../mock/MockBackgroundState"

export const AddTokens = () => (
    <MockPopup
        location={`/settings/tokens/add`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const ConfirmToken = () => (
    <MockPopup
        location={`/settings/tokens/confirm`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export default { title: "Token Views" } as Meta
