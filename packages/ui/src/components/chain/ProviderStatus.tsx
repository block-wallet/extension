import { useRef, useState } from "react"
import { CSSTransition } from "react-transition-group"
import { AiFillInfoCircle } from "react-icons/ai"
import { BiShield } from "react-icons/bi"
import { HiOutlineExclamationCircle, HiOutlineCheckCircle } from "react-icons/hi"
import { MdSignalWifiOff } from "react-icons/md"

import { useBlankState } from "../../context/background/backgroundHooks"
import { switchProvider } from "../../context/commActions"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { Classes, classnames } from "../../styles"
import CloseIcon from "../icons/CloseIcon"
import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"

enum ProviderType {
    DEFAULT = "DEFAULT",
    BACKUP = "BACKUP",
    CUSTOM = "CUSTOM",
    CURRENT = "CURRENT",
}

const StatusIndicator = ({
    type,
    animated = false
}: {
    type: 'online' | 'offline' | 'warning' | 'success'
    animated?: boolean
}) => {
    const baseClasses = "w-2 h-2 rounded-full"
    const animatedClasses = animated ? "animate-pulse" : ""

    switch (type) {
        case 'online':
            return <div className={`${baseClasses} bg-green-500 ${animatedClasses}`} />
        case 'offline':
            return <div className={`${baseClasses} bg-red-500 ${animatedClasses}`} />
        case 'warning':
            return <div className={`${baseClasses} bg-amber-500 ${animatedClasses}`} />
        case 'success':
            return <div className={`${baseClasses} bg-blue-500 ${animatedClasses}`} />
        default:
            return <div className={`${baseClasses} bg-gray-400`} />
    }
}

const ProviderBanner = ({
    type,
    title,
    onAction
}: {
    type: 'info' | 'warning' | 'success' | 'error'
    title: string
    onAction: () => void
}) => {
    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50",
                    text: "text-blue-900 dark:text-blue-100",
                    icon: "text-blue-600 dark:text-blue-400",
                    button: "text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                }
            case 'warning':
                return {
                    container: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50",
                    text: "text-amber-900 dark:text-amber-100",
                    icon: "text-amber-600 dark:text-amber-400",
                    button: "text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                }
            case 'error':
                return {
                    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50",
                    text: "text-red-900 dark:text-red-100",
                    icon: "text-red-600 dark:text-red-400",
                    button: "text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
                }
            default:
                return {
                    container: "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
                    text: "text-gray-900 dark:text-gray-100",
                    icon: "text-gray-600 dark:text-gray-400",
                    button: "text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200"
                }
        }
    }

    const styles = getStyles()

    return (
        <div className={`border-l-4 p-4 ${styles.container} transition-all duration-200`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <StatusIndicator type={type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'offline' : 'online'} />
                        <AiFillInfoCircle className={`w-4 h-4 ${styles.icon}`} />
                    </div>
                    <span className={`text-sm font-medium ${styles.text}`}>
                        {title}
                    </span>
                </div>
                <button
                    onClick={onAction}
                    className={`text-sm font-semibold ${styles.button} transition-colors duration-150 hover:underline`}
                >
                    Learn more
                </button>
            </div>
        </div>
    )
}

const ProviderStatus = ({ onHomepage }: { onHomepage?: boolean }) => {
    const { isUserNetworkOnline, isNetworkChanging, providerStatus } =
        useBlankState()!

    const nodeRef = useRef(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        isCurrentProviderOnline,
        isBackupProviderOnline,
        isDefaultProviderOnline,
        isUsingBackupProvider,
    } = providerStatus

    const network = useSelectedNetwork()
    const { chainId, currentRpcUrl, defaultRpcUrl } = network

    const history = useOnMountHistory()

    const [open, setOpen] = useState(false)

    const isUsingDefaultRpc = currentRpcUrl === defaultRpcUrl

    const showDefaultProviderRestored =
        isDefaultProviderOnline &&
        isUsingBackupProvider &&
        isCurrentProviderOnline

    const showSwitchToBackup =
        !isCurrentProviderOnline && isUsingDefaultRpc && isBackupProviderOnline

    const showSwitchToDefault =
        !isCurrentProviderOnline &&
        !isUsingDefaultRpc &&
        isDefaultProviderOnline

    const showProviderStatus =
        !isNetworkChanging &&
        ((!isCurrentProviderOnline && isUserNetworkOnline) ||
            showDefaultProviderRestored ||
            isUsingBackupProvider)

    const handleSwitch = async () => {
        setIsLoading(true)

        setTimeout(async () => {
            if (
                showSwitchToBackup ||
                showSwitchToDefault ||
                showDefaultProviderRestored
            ) {
                const providerType = showSwitchToBackup
                    ? ProviderType.BACKUP
                    : ProviderType.DEFAULT
                await switchProvider({ chainId, providerType })
            } else {
                history.push({
                    pathname: "/settings/networks/details",
                    state: {
                        network,
                    },
                })
            }
            setIsLoading(false)
            setOpen(false)
        }, 1000)
    }

    const getBannerConfig = () => {
        if (showSwitchToBackup) {
            return {
                type: 'warning' as const,
                title: "Default provider is down"
            }
        }
        if (showDefaultProviderRestored) {
            return {
                type: 'success' as const,
                title: "Default provider is restored"
            }
        }
        if (isUsingBackupProvider && isCurrentProviderOnline) {
            return {
                type: 'info' as const,
                title: "Backup provider is active"
            }
        }
        return {
            type: 'error' as const,
            title: "Provider is down"
        }
    }

    const bannerConfig = getBannerConfig()

    const modalTitle = showSwitchToBackup
        ? "Default Provider is Down"
        : showDefaultProviderRestored
            ? "Default Provider is Restored"
            : isUsingBackupProvider && isCurrentProviderOnline
                ? "Backup Provider is Active"
                : "Provider is Down"

    const modalText = showSwitchToBackup
        ? "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider switching to a backup provider."
        : showDefaultProviderRestored
            ? "You previously switched to a backup provider. You can now switch back to the default provider."
            : showSwitchToDefault
                ? "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider switching to BlockWallet's default provider."
                : isUsingBackupProvider && isCurrentProviderOnline
                    ? "Your wallet assets remain safe and unaffected. When a backup provider is active, Privacy Proxies will not be used when interacting with the blockchain."
                    : "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider changing the network's RPC URL from network settings."

    const modalCallOut = showSwitchToBackup
        ? "Privacy Proxies are not enabled on the backup provider, which will impact the privacy of your transactions."
        : showSwitchToDefault
            ? "Privacy Proxies will be enabled on the default provider, which help protect the privacy of your transactions."
            : isUsingBackupProvider && isCurrentProviderOnline
                ? "You will be notified on your home screen once your default provider and Privacy Proxies become available."
                : "Privacy Proxies are not enabled on custom providers, which will impact the privacy of your transactions."

    const SwitchCTA =
        showSwitchToBackup || showDefaultProviderRestored || showSwitchToDefault

    const showModalCTA =
        !(isUsingBackupProvider && isCurrentProviderOnline) ||
        showDefaultProviderRestored

    return (
        <>
            <CSSTransition
                in={showProviderStatus}
                timeout={200}
                unmountOnExit
                classNames={"slide"}
                nodeRef={nodeRef}
            >
                <div
                    ref={nodeRef}
                    className={classnames(
                        "transition-all duration-200",
                        onHomepage && "-ml-6 -mt-[0.97rem] mb-2"
                    )}
                    style={
                        onHomepage ? { width: "calc(100% + 2 * 1.5rem)" } : {}
                    }
                >
                    <ProviderBanner
                        type={bannerConfig.type}
                        title={bannerConfig.title}
                        onAction={() => setOpen(true)}
                    />
                </div>
            </CSSTransition>

            <Dialog open={open} onClickOutside={() => setOpen(false)}>
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setOpen(false)}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 dark:text-gray-100 transition duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>

                <div className="flex flex-col w-full h-full">
                    <div className="flex items-center space-x-3 px-3 pr-0 pb-3">
                        {showDefaultProviderRestored ? (
                            <HiOutlineCheckCircle className="w-6 h-6 text-blue-500" />
                        ) : showSwitchToBackup || (isUsingBackupProvider && isCurrentProviderOnline) ? (
                            <HiOutlineExclamationCircle className="w-6 h-6 text-amber-500" />
                        ) : (
                            <MdSignalWifiOff className="w-6 h-6 text-red-500" />
                        )}
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {modalTitle}
                        </h2>
                    </div>

                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 px-3">
                        <div className="mb-3">{modalText}</div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                            <div className="flex items-start space-x-2">
                                {isUsingBackupProvider ? (
                                    <BiShield className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0 opacity-60" />
                                ) : (
                                    <BiShield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Privacy Notice
                                    </span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        {modalCallOut}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {showModalCTA && (
                    <>
                        <div className="-mx-3">
                            <Divider />
                        </div>
                        <div className="mt-4 -mb-2 mx-2">
                            <ButtonWithLoading
                                isLoading={isLoading}
                                label={isLoading ? "Switching..." : SwitchCTA ? "Switch Provider" : "Edit RPC URL"}
                                spinnerSize="24"
                                onClick={handleSwitch}
                                disabled={isLoading}
                                buttonClass={classnames(
                                    Classes.darkButton,
                                    "w-full"
                                )}
                            />
                        </div>
                    </>
                )}
            </Dialog>
        </>
    )
}

export default ProviderStatus
