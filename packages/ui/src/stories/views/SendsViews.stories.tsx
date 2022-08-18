import { Meta } from "@storybook/react"
import { MockPopup } from "../../mock/MockApp"
import { initBackgroundState } from "../../mock/MockBackgroundState"

export const Send = () => (
    <MockPopup
        location={`/send`}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const SendConfirm = () => (
    <MockPopup
        location={`/send/confirm`}
        assignBlankState={initBackgroundState.blankState}
        state={{
            address: "0x45D007a66D1f71C07F02da5A5ffEE82B05D210FB",
        }}
    />
)

export const SendDone = () => (
    <MockPopup location={`/send/done`} state={{}} assignBlankState={{}} />
)

export default { title: "Sends Views" } as Meta
