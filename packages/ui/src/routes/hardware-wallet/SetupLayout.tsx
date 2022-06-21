import React, { FunctionComponent } from "react"
import IsLockedDialog from "../../components/dialog/IsLockedDialog"
import Divider from "../../components/Divider"
import PageLayout from "../../components/PageLayout"

type SetupLayoutProps = {
    title: string
    subtitle: string
    buttons: React.ReactNode
}

const HardwareWalletSetupLayout: FunctionComponent<SetupLayoutProps> = ({
    children,
    title,
    subtitle,
    buttons,
}) => (
    <PageLayout header style={{ maxWidth: "500px" }}>
        <IsLockedDialog />
        <span className="my-8 text-2xl font-bold font-title">{title}</span>
        <Divider />
        <div className="pt-8 px-8 flex w-full">
            <span className=" px-6 text-base leading-relaxed text-center text-gray-600 w-full">
                {subtitle}
            </span>
        </div>
        <div className="flex flex-col w-full">{children}</div>
        <Divider />
        <div className="p-8 w-full flex space-x-5">{buttons}</div>
    </PageLayout>
)

export default HardwareWalletSetupLayout
