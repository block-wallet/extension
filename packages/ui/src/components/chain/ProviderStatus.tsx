import { useEffect, useState } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    getChainRpcs,
    isRpcValid,
    editNetwork,
} from "../../context/commActions"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { Classes, classnames } from "../../styles"
import { AiFillInfoCircle } from "react-icons/ai"
import Dialog from "../dialog/Dialog"
import CloseIcon from "../icons/CloseIcon"
import Divider from "../Divider"
import switchIcon from "../../assets/images/icons/switch.svg"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { NetworkRPCs } from "@block-wallet/background/controllers/NetworkController"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"

interface isChainUsingBackupObject {
    [x: number]: boolean
}

const ProviderStatus = () => {
    const { isProviderNetworkOnline, isUserNetworkOnline, isNetworkChanging } =
        useBlankState()!

    const network = useSelectedNetwork()
    const { chainId } = network

    const history = useOnMountHistory()

    const [open, setOpen] = useState(false)
    const [chainRpcs, setChainRpcs] = useState<NetworkRPCs>({})

    const { selectedRpcUrl, defaultRpcUrl, backupRpcUrl } = chainRpcs

    const [defaultRpcUp, setDefaultRpcUp] = useState(true)
    const [backupRpcUp, setBackupRpcUp] = useState(true)

    const [persistedData, setPersistedData] =
        useLocalStorageState<isChainUsingBackupObject>(
            "provider.switchedToBackup",
            {
                initialValue: {},
                volatile: false,
            }
        )

    const isUsingDefaultRpc = selectedRpcUrl === defaultRpcUrl

    const isUsingBackupRpc = persistedData[chainId]

    const isUsingCustomRpc =
        selectedRpcUrl !== defaultRpcUrl && selectedRpcUrl !== backupRpcUrl

    const showDefaultProviderRestored = defaultRpcUp && isUsingBackupRpc

    const showSwitchToBackup =
        !isProviderNetworkOnline && isUsingDefaultRpc && backupRpcUp

    const showSwitchToDefault =
        !isProviderNetworkOnline && isUsingCustomRpc && defaultRpcUp

    const showProviderStatus =
        !isNetworkChanging &&
        ((!isProviderNetworkOnline && isUserNetworkOnline) ||
            showDefaultProviderRestored)

    // Fetch chain RPCs(selected, default & backup) with network change or after provider status changes(after switching RPCs)
    useEffect(() => {
        getChainRpcs(chainId).then(setChainRpcs)
    }, [chainId, isProviderNetworkOnline])

    // Check RPCs validity whenever they change or if the provider status changes
    useEffect(() => {
        Promise.all([
            isRpcValid(defaultRpcUrl ?? "", chainId),
            isRpcValid(backupRpcUrl ?? "", chainId),
        ]).then(([isDefaultRpcUp, isBackupRpcUp]) => {
            setDefaultRpcUp(isDefaultRpcUp)
            setBackupRpcUp(isBackupRpcUp)
        })
    }, [defaultRpcUrl, backupRpcUrl, isProviderNetworkOnline])

    // After switching to a Backup Provider check if the default if back online each minute
    useEffect(() => {
        let intervalId: NodeJS.Timer | null = null

        async function checkDefaultRpcValidity() {
            const isValid = await isRpcValid(defaultRpcUrl ?? "", chainId)
            if (isValid) {
                setDefaultRpcUp(true)
                if (intervalId) clearInterval(intervalId)
            }
        }

        if (!defaultRpcUp && isUsingBackupRpc) {
            intervalId = setInterval(() => {
                checkDefaultRpcValidity()
            }, 60 * 1000)
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [chainId, persistedData, defaultRpcUp])

    const switchProvider = async () => {
        if (
            showSwitchToBackup ||
            showSwitchToDefault ||
            showDefaultProviderRestored
        ) {
            const rpcUrl = showSwitchToBackup
                ? chainRpcs?.backupRpcUrl!
                : chainRpcs?.defaultRpcUrl!
            await editNetwork({
                chainId: `${network?.chainId}`,
                updates: {
                    rpcUrl,
                    name: network?.desc,
                    test: !!network?.test,
                    blockExplorerUrl:
                        network?.blockExplorerUrls &&
                        network?.blockExplorerUrls.length > 0
                            ? network.blockExplorerUrls[0]
                            : undefined,
                },
            })
            if (showSwitchToBackup) {
                setPersistedData((prevState) => ({
                    ...prevState,
                    [chainId]: true,
                }))
            } else {
                setPersistedData((prevState) => ({
                    ...prevState,
                    [chainId]: false,
                }))
            }
        } else {
            history.push({
                pathname: "/settings/networks/details",
                state: {
                    network,
                },
            })
        }
        setOpen(false)
    }

    const bannerTitle = showSwitchToBackup
        ? "Default provider down."
        : showDefaultProviderRestored
        ? "Default provider restored."
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
        : "Provider is Down"

    const modalText = showSwitchToBackup
        ? "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider switching to a backup provider."
        : showDefaultProviderRestored
        ? "You previously switched to a backup provider. You can now switch back to the default provider."
        : showSwitchToDefault
        ? "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider switching to BlockWallet’s default provider."
        : "Your wallet assets are secure and unaffected by this issue. To access your balances and perform transactions, consider changing the network's RPC URL from network settings."

    const modalCallOut = showSwitchToBackup
        ? "Privacy Proxies are not enabled on the backup provider, which will impact the privacy of your transactions."
        : showSwitchToDefault
        ? "Privacy Proxies will be enabled on the default provider, which help protect the privacy of your transactions."
        : "Privacy Proxies are not enabled on custom providers, which will impact the privacy of your transactions."

    const SwitchCTA =
        showSwitchToBackup || showDefaultProviderRestored || showSwitchToDefault

    return (
        <>
            {showProviderStatus && (
                <>
                    <div
                        className={classnames(
                            " text-sm -ml-6 p-3 px-6 -mt-[0.65rem] flex justify-between relative mb-2",
                            showDefaultProviderRestored
                                ? "text-primary-blue-default bg-[#f3f4ff]"
                                : "bg-[#FFF8EE] text-[#C16C0E]"
                        )}
                        style={{ width: "calc(100% + 2 * 1.5rem)" }}
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
                        <div className="-mx-3">
                            <Divider />
                        </div>
                        <button
                            onClick={switchProvider}
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
                                    />
                                    Switch
                                </>
                            ) : (
                                "Edit RPC URL"
                            )}
                        </button>
                    </Dialog>
                </>
            )}
        </>
    )
}

export default ProviderStatus
