import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import VerticalSelect from "../../components/input/VerticalSelect"

import purseIcon from "../../assets/images/icons/purse.svg"
import blankBlueIcon from "../../assets/images/icons/blank_blue.svg"
import infoIcon from "../../assets/images/icons/info_circle.svg"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { updateDepositsTree } from "../../context/commActions"
import { useEffect } from "react"

const WithdrawTypeSelectPage = () => {
    const history: any = useOnMountHistory()
    const { pair, preSelectedAsset, isAssetDetailsPage } =
        history.location.state

    useEffect(() => {
        updateDepositsTree(pair)
    }, [pair])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Withdraw From Privacy Pool"
                    onBack={() => {
                        history.push({
                            pathname: "/privacy/withdraw",
                            state: { preSelectedAsset, isAssetDetailsPage },
                        })
                    }}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6 text-gray-500">
                <div className="text-sm">
                    <span>
                        Do you want to withdraw under a clean slate or to your
                        external wallet?
                    </span>
                </div>
                <div className="flex flex-col space-y-1">
                    <VerticalSelect
                        options={[
                            {
                                icon: purseIcon,
                                label: "External Wallet",
                                to: {
                                    pathname: "/privacy/withdraw/external",
                                    state: {
                                        pair,
                                        preSelectedAsset,
                                        isAssetDetailsPage,
                                    },
                                },
                            },
                            {
                                icon: blankBlueIcon,
                                label: "BlockWallet",
                                to: {
                                    pathname:
                                        "/privacy/withdraw/block/accounts",
                                    state: {
                                        pair,
                                        preSelectedAsset,
                                        isAssetDetailsPage,
                                    },
                                },
                            },
                        ]}
                        value={undefined}
                        onChange={(option) => history.push(option.to)}
                        display={(option, i) => (
                            <div className="flex flex-row items-center space-x-3 text-gray-900">
                                <div className="-ml-1 -my-1 p-2.5 bg-white rounded-full">
                                    <img
                                        src={option.icon}
                                        alt="icon"
                                        className="w-4 h-4"
                                    />
                                </div>
                                <span className="font-bold">
                                    {option.label}
                                </span>
                            </div>
                        )}
                    />
                </div>
                <div className="flex flex-row items-start space-x-4 text-xs">
                    <img src={infoIcon} alt="info" className="w-3 h-3 mt-1" />
                    <span>
                        Withdraw to BlockWallet if you want to continue
                        operating privately with these funds.
                    </span>
                </div>
            </div>
        </PopupLayout>
    )
}

export default WithdrawTypeSelectPage
