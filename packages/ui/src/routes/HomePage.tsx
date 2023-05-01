import { Profiler, useState } from "react"
import { Link, useHistory } from "react-router-dom"
import GearIcon from "../components/icons/GearIcon"
import QRIcon from "../components/icons/QRIcon"
import NetworkSelect from "../components/input/NetworkSelect"
import ErrorDialog from "../components/dialog/ErrorDialog"
import AccountIcon from "../components/icons/AccountIcon"
import ActivityAssetsView from "../components/home/ActivityAssetsView"
import Tooltip from "../components/label/Tooltip"
import { getAccountColor } from "../util/getAccountColor"
import { useBlankState } from "../context/background/backgroundHooks"
import GasPricesInfo from "../components/home/GasPricesInfo"
import useMetricCollector from "../util/useMetricCollector"
import HomeBalancePanel from "../components/home/HomeBalancePanel"
import DAppConnection from "../components/home/DAppConnection"
import AccountAvatar from "../components/home/AccountAvatar"
import TransparentOverlay from "../components/loading/TransparentOverlay"
import { useSelectedAddressWithChainIdChecksum } from "../util/hooks/useSelectedAddressWithChainIdChecksum"
import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import { useSelectedNetwork } from "../context/hooks/useSelectedNetwork"
import { useHotkeys } from "react-hotkeys-hook"
import { componentsHotkeys } from "../util/hotkeys"
import { generateExplorerLink } from "../util/getExplorer"
import ProviderStatus from "../components/chain/ProviderStatus"

const HomePage = () => {
    const collect = useMetricCollector()
    const error = (useHistory().location.state as { error: string })?.error
    const state = useBlankState()!
    const history = useHistory()
    const checksumAddress = useSelectedAddressWithChainIdChecksum()
    const [hasErrorDialog, setHasErrorDialog] = useState(!!error)
    const { isSendEnabled, isSwapEnabled, isBridgeEnabled, showGasLevels } =
        useSelectedNetwork()

    const hotkeysPermissions = {
        "/home/alt/s": isSendEnabled, //Send
        "/home/alt/w": isSwapEnabled, //Swap
        "/home/alt/b": isBridgeEnabled !== undefined, //Bridge
        "/home/alt/g": showGasLevels,
    }

    const popupPageHotkeys = componentsHotkeys.PopupPage
    useHotkeys(popupPageHotkeys, () => {
        if (!state.hotkeysEnabled) return

        chrome.tabs.create({
            url: generateExplorerLink(
                state.availableNetworks,
                state.selectedNetwork,
                checksumAddress,
                "address"
            ),
        })
    })

    return (
        <Profiler id="popup" onRender={collect}>
            <PopupLayout
                header={
                    <PopupHeader
                        title=""
                        close={false}
                        backButton={false}
                        permissions={hotkeysPermissions}
                    >
                        {state.isNetworkChanging && <TransparentOverlay />}
                        <div
                            className="absolute top-0 left-0 z-10 flex flex-col items-start w-full px-6 py-4 bg-white bg-opacity-75 border-b border-b-gray-200 popup-layout"
                            style={{ backdropFilter: "blur(4px)" }}
                        >
                            <div className="flex flex-row items-center justify-between w-full">
                                <div className="flex flex-row items-center space-x-3">
                                    <div className="relative flex flex-col items-start group">
                                        <Link
                                            to="/accounts"
                                            className="transition duration-300"
                                            draggable={false}
                                            data-testid="navigate-account-link"
                                        >
                                            <AccountIcon
                                                className="w-8 h-8 transition-transform duration-200 ease-in transform hover:rotate-180"
                                                fill={getAccountColor(
                                                    checksumAddress
                                                )}
                                            />
                                        </Link>
                                        <Tooltip
                                            className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-medium bg-primary-black-default text-white"
                                            content={
                                                <>
                                                    <span>My Accounts</span>
                                                </>
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-row items-center space-x-1">
                                        <AccountAvatar />
                                        <Link
                                            to="/accounts/menu/receive"
                                            draggable={false}
                                            onClick={(e) => {
                                                e.preventDefault()

                                                history.push(
                                                    "/accounts/menu/receive"
                                                )
                                            }}
                                            className="p-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                                        >
                                            <QRIcon />
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex flex-row items-center -mr-1 space-x-2">
                                    <GasPricesInfo />
                                    <Link
                                        to="/settings"
                                        draggable={false}
                                        onClick={(e) => {
                                            e.preventDefault()

                                            history.push("/settings")
                                        }}
                                        className="p-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                                    >
                                        <GearIcon />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </PopupHeader>
                }
                hotkeysPermissions={hotkeysPermissions}
            >
                <ErrorDialog
                    title="Error!"
                    message={error}
                    open={hasErrorDialog}
                    onClickOutside={() => {
                        setHasErrorDialog(false)
                    }}
                    onDone={() => setHasErrorDialog(false)}
                />
                <div className="flex flex-col items-start flex-1 w-full mt-1 space-y-2 overflow-auto hide-scroll">
                    <div className="w-full h-full">
                        <ProviderStatus onHomepage />
                        <div className="flex flex-row items-start w-full justify-between pt-1 pb-2 p-6">
                            <NetworkSelect />
                            <DAppConnection />
                        </div>
                        <HomeBalancePanel />
                        <ActivityAssetsView initialTab={state.popupTab} />
                    </div>
                </div>
            </PopupLayout>
        </Profiler>
    )
}

export default HomePage
