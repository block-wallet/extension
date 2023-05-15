import { useRef, useState } from "react"
import { CSSTransition } from "react-transition-group"
import { AiFillInfoCircle } from "react-icons/ai"

import { useBlankState } from "../../context/background/backgroundHooks"
import { switchProvider } from "../../context/commActions"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { Classes, classnames } from "../../styles"
import CloseIcon from "../icons/CloseIcon"
import switchIcon from "../../assets/images/icons/switch.svg"
import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import { ButtonWithLoading } from "../button/ButtonWithLoading"

enum ProviderType {
    DEFAULT = "DEFAULT",
    BACKUP = "BACKUP",
    CUSTOM = "CUSTOM",
    CURRENT = "CURRENT",
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

    const bannerTitle = showSwitchToBackup
        ? "Default provider down."
        : showDefaultProviderRestored
        ? "Default provider restored."
        : isUsingBackupProvider && isCurrentProviderOnline
        ? "Backup provider active."
        : "Provider down."

    const bannerCta = showSwitchToBackup
        ? "Switch to backup"
        : showDefaultProviderRestored
        ? "Switch now"
        : showSwitchToDefault
        ? "Switch now"
        : "Read more"

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
        ? "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider switching to BlockWallet’s default provider."
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
                        "text-sm p-3 px-6 flex justify-between relative",
                        onHomepage && "-ml-6 -mt-[0.97rem] mb-2",
                        showDefaultProviderRestored
                            ? "text-primary-blue-default bg-[#f3f4ff]"
                            : "bg-[#FFF8EE] text-[#C16C0E]"
                    )}
                    style={
                        onHomepage ? { width: "calc(100% + 2 * 1.5rem)" } : {}
                    }
                >
                    <div className="flex space-x-2 items-center">
                        <AiFillInfoCircle size={18} />
                        <span>{bannerTitle}</span>
                    </div>
                    <span
                        className="font-semibold cursor-pointer pr-1"
                        onClick={() => setOpen(true)}
                    >
                        {bannerCta}
                    </span>
                </div>
            </CSSTransition>
            <Dialog open={open} onClickOutside={() => setOpen(false)}>
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setOpen(false)}
                        className="cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>

                <div className="flex flex-col w-full h-full">
                    <h2 className="px-3 pr-0 pb-3 text-base font-semibold">
                        {modalTitle}
                    </h2>
                    <div className="mb-4 text-sm text-primary-grey-dark px-3">
                        <div className="mb-3">{modalText}</div>
                        <div>
                            <span className="font-semibold text-primary-black-default">
                                Attention!
                            </span>{" "}
                            {modalCallOut}
                        </div>
                    </div>
                </div>
                {showModalCTA && (
                    <>
                        <div className="-mx-3">
                            <Divider />
                        </div>
                        {isLoading ? (
                            <ButtonWithLoading
                                isLoading={true}
                                label="Switching"
                                spinnerSize="12"
                                buttonClass={classnames(
                                    Classes.darkButton,
                                    "mt-4 -mb-2 mx-2 w-auto"
                                )}
                            />
                        ) : (
                            <button
                                onClick={handleSwitch}
                                className={classnames(
                                    Classes.darkButton,
                                    "mt-4 -mb-2 mx-2"
                                )}
                                type="button"
                            >
                                {SwitchCTA ? (
                                    <>
                                        <img
                                            src={switchIcon}
                                            className="w-4 h-4 mr-2 text-white"
                                            alt="Switch"
                                        />
                                        Switch
                                    </>
                                ) : (
                                    "Edit RPC URL"
                                )}
                            </button>
                        )}
                    </>
                )}
            </Dialog>
        </>
    )
}

export default ProviderStatus
