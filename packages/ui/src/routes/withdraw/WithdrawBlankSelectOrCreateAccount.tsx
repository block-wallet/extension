import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import VerticalSelect from "../../components/input/VerticalSelect"

import accountCheck from "../../assets/images/icons/account_check.svg"
import accountAdd from "../../assets/images/icons/account_add.svg"
import PopupFooter from "../../components/popup/PopupFooter"
import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const WithdrawBlankSelectOrCreateAccount = () => {
    const history: any = useOnMountHistory()
    const { pair, preSelectedAsset, isAssetDetailsPage } =
        history.location.state
    return (
        <PopupLayout
            header={
                <PopupHeader title="Withdraw From Privacy Pool" close="/" />
            }
            footer={
                <PopupFooter>
                    <LinkButton
                        text="Back"
                        location="/privacy/withdraw/select"
                        state={{ pair, isAssetDetailsPage }}
                        classes="w-full"
                        lite
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                <div className="flex flex-col space-y-1">
                    <VerticalSelect
                        options={[
                            {
                                icon: accountCheck,
                                label: "Select Account",
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
                            {
                                icon: accountAdd,
                                label: "Create an Account",
                                to: {
                                    pathname:
                                        "/privacy/withdraw/block/accounts/create",
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
                        containerClassName="flex flex-col space-y-4"
                        display={(option, i) => (
                            <div className="flex flex-row items-center space-x-3 text-gray-900">
                                <img
                                    src={option.icon}
                                    alt="icon"
                                    className="w-5 h-5"
                                />
                                <span className="font-bold">
                                    {option.label}
                                </span>
                            </div>
                        )}
                    />
                </div>
            </div>
        </PopupLayout>
    )
}

export default WithdrawBlankSelectOrCreateAccount
