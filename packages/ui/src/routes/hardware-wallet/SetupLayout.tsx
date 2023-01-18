import { FC, PropsWithChildren } from "react"
import IsLockedDialog from "../../components/dialog/IsLockedDialog"
import Divider from "../../components/Divider"
import PageLayout from "../../components/PageLayout"

type SetupLayoutProps = {
    title: string
    subtitle: string
    buttons: React.ReactNode
    childrenClass?: string
    buttonClass?: string
}

const HardwareWalletSetupLayout: FC<PropsWithChildren<SetupLayoutProps>> = ({
    children,
    title,
    subtitle,
    buttons,
    childrenClass,
    buttonClass,
}) => (
    <PageLayout header style={{ maxWidth: "500px" }}>
        <IsLockedDialog />
        <span className="my-8 text-2xl font-bold font-title">{title}</span>
        <Divider />
        {subtitle && (
            <div className="pt-8 px-8 flex w-full">
                <span className=" px-6 text-base leading-relaxed text-center text-gray-600 w-full">
                    {subtitle}
                </span>
            </div>
        )}
        <div className={childrenClass ?? "flex flex-col w-full"}>
            {children}
        </div>
        <Divider />
        <div className={buttonClass ?? "p-8 w-full flex space-x-5"}>
            {buttons}
        </div>
    </PageLayout>
)

export default HardwareWalletSetupLayout
