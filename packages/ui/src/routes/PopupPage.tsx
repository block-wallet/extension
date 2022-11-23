import { Profiler, useState } from "react"
import { Link, useHistory } from "react-router-dom"

// Components
import PageLayout from "../components/PageLayout"
import GearIcon from "../components/icons/GearIcon"
import QRIcon from "../components/icons/QRIcon"
import NetworkSelect from "../components/input/NetworkSelect"
import ErrorDialog from "../components/dialog/ErrorDialog"
import AccountIcon from "../components/icons/AccountIcon"
import ActivityAssetsView from "../components/home/ActivityAssetsView"
import GenericTooltip from "../components/label/GenericTooltip"
import Tooltip from "../components/label/Tooltip"

// Utils
import { getAccountColor } from "../util/getAccountColor"

// Context
import { useBlankState } from "../context/background/backgroundHooks"
import { useSelectedAccount } from "../context/hooks/useSelectedAccount"

// Assets
import GasPricesInfo from "../components/home/GasPricesInfo"
import useMetricCollector from "../util/useMetricCollector"
import HomeBalancePanel from "../components/home/HomeBalancePanel"
import DAppConnection from "../components/home/DAppConnection"
import AccountAvatar from "../components/home/AccountAvatar"
import { ActivityListStateProvider } from "../context/background/useActivityListState"

const PopupPage = () => {
    const collect = useMetricCollector()
    const error = (useHistory().location.state as { error: string })?.error
    const state = useBlankState()!
    const history = useHistory()
    const account = useSelectedAccount()

    const [hasErrorDialog, setHasErrorDialog] = useState(!!error)

    return (
        <Profiler id="popup" onRender={collect}>
            <PageLayout screen className="max-h-screen popup-layout">
                <ErrorDialog
                    title="Error!"
                    message={error}
                    open={hasErrorDialog}
                    onClickOutside={() => {
                        setHasErrorDialog(false)
                    }}
                    onDone={() => setHasErrorDialog(false)}
                />
                <div
                    className="sticky z-10 flex flex-col items-start w-full p-6 bg-white bg-opacity-75 border-b border-b-gray-200 popup-layout"
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
                                        fill={getAccountColor(account?.address)}
                                    />
                                </Link>
                                <Tooltip
                                    className="pointer-events-none absolute bottom-0 -mb-2 transform !translate-x-0 !translate-y-full p-2 rounded-md text-xs font-bold bg-gray-900 text-white"
                                    content={
                                        <>
                                            <div className="border-t-4 border-r-4 border-gray-900 absolute top-0 left-2 w-2 h-2 -mt-2.5 transform -rotate-45 -translate-x-1/2" />
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

                                        history.push("/accounts/menu/receive")
                                    }}
                                    className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
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
                                className="p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                            >
                                <GearIcon />
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-start flex-1 w-full mt-1 space-y-2 overflow-auto hide-scroll">
                    <div className="w-full h-full">
                        <div className="flex flex-row items-start w-full justify-between pt-1 pb-2 p-6">
                            <GenericTooltip
                                bottom
                                disabled={!state.isImportingDeposits}
                                content={
                                    <p className="w-40 text-center">
                                        Please wait until deposits are done
                                        loading to change networks. This can
                                        take up to 15 minutes.
                                    </p>
                                }
                            >
                                <NetworkSelect />
                            </GenericTooltip>
                            <DAppConnection />
                        </div>
                        <div className="px-6">
                            <HomeBalancePanel />
                        </div>
                        <ActivityAssetsView initialTab={state.popupTab} />
                    </div>
                </div>
            </PageLayout>
        </Profiler>
    )
}

export default PopupPage
