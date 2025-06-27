import { FC, PropsWithChildren } from "react"
import IsLockedDialog from "../../components/dialog/IsLockedDialog"
import Divider from "../../components/Divider"
import PageLayout from "../../components/PageLayout"

type SetupLayoutProps = {
    title: string
    subtitle: string
    buttons?: React.ReactNode
    childrenClass?: string
    buttonClass?: string
}

// Utility function to detect if we're in a browser tab vs extension popup
const isBrowserTabContext = (): boolean => {
    // Check if we're in a browser tab (larger viewport) vs extension popup
    if (typeof window !== 'undefined') {
        // Extension popup is typically 375x600px or similar small size
        const isLargeViewport = window.innerWidth > 600 || window.innerHeight > 700
        // Also check if we're in a tab.html context
        const isTabContext = window.location.pathname.includes('tab.html') ||
            window.location.pathname.includes('hardware-wallet-bridge')
        return isLargeViewport || isTabContext
    }
    return false
}

const HardwareWalletSetupLayout: FC<PropsWithChildren<SetupLayoutProps>> = ({
    children,
    title,
    subtitle,
    buttons,
    childrenClass,
    buttonClass,
}) => {
    const isBrowserTab = isBrowserTabContext()

    if (isBrowserTab) {
        // Full page layout for browser context
        return (
            <div className="min-h-screen w-full bg-white dark:bg-gray-800 flex flex-col">
                <IsLockedDialog />

                {/* Header */}
                <div className="w-full py-16 px-8 text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className={childrenClass ?? "flex-1 w-full bg-white dark:bg-gray-800 px-8 py-12"}>
                    {children}
                </div>

                {/* Footer/Buttons */}
                {buttons && (
                    <div className={buttonClass ?? "w-full p-12 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-center space-x-6"}>
                        {buttons}
                    </div>
                )}
            </div>
        )
    }

    // Extension popup layout (constrained)
    return (
        <PageLayout
            header
            style={{ maxWidth: "500px" }}
            maxWidth="max-w-md"
            className="bg-white dark:bg-gray-800"
        >
            <IsLockedDialog />
            <div className="my-8 text-center">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
            </div>
            <Divider />
            {subtitle && (
                <div className="pt-8 px-8 flex w-full">
                    <span className="px-6 text-base leading-relaxed text-center text-gray-600 dark:text-gray-400 w-full">
                        {subtitle}
                    </span>
                </div>
            )}
            <div className={childrenClass ?? "flex flex-col w-full bg-white dark:bg-gray-800"}>
                {children}
            </div>
            {buttons && (
                <>
                    <Divider />
                    <div className={buttonClass ?? "p-8 w-full flex space-x-5 bg-white dark:bg-gray-800 justify-center"}>
                        {buttons}
                    </div>
                </>
            )}
        </PageLayout>
    )
}

export default HardwareWalletSetupLayout
