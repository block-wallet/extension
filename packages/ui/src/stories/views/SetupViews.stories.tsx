import { Meta } from "@storybook/react"
import { MockTab } from "../../mock/MockApp"

export const CreatePassword = () => (
    <MockTab
        location="/setup/create"
        assignBlankState={{
            isOnboarded: false,
        }}
    />
)

export const BackUpSeed = () => (
    <MockTab
        location="/setup/create/notice"
        state={{
            seedPhrase: "test phrase words random asd",
        }}
        assignBlankState={{
            isOnboarded: false,
        }}
    />
)

export default { title: "Setup Views" } as Meta
