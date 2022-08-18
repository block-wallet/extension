import { FunctionComponent, useEffect, useState } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import { Classes } from "../../styles/classes"

import VerticalSelect from "../../components/input/VerticalSelect"

import noMoney from "../../assets/images/icons/no_money.svg"
import { updateNotesSpentState } from "../../context/commActions"
import { ResponseBlankCurrencyDepositsCount } from "@block-wallet/background/utils/types/communication"
import { useBlankState } from "../../context/background/backgroundHooks"
import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Spinner from "../../components/spinner/Spinner"
import log from "loglevel"

import { PairCount } from "@block-wallet/background/controllers/blank-deposit/infrastructure/IBlankDepositService"

import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { KnownCurrencies } from "@block-wallet/background/controllers/blank-deposit/types"

interface WithdrawPageLocationState {
    isAssetDetailsPage: boolean
    preSelectedAsset: TokenWithBalance
}

const CanWithdrawView: FunctionComponent<{
    options: ResponseBlankCurrencyDepositsCount
    preSelectedAsset: TokenWithBalance
    isAssetDetailsPage: boolean
    onBack: () => void
}> = ({ options, preSelectedAsset, isAssetDetailsPage, onBack }) => {
    const [optionIndex, setOptionIndex] = useState(0)

    const history = useOnMountHistory()
    const next = () => {
        history.push({
            pathname: "/privacy/withdraw/select",
            state: {
                pair: options[optionIndex].pair,
                preSelectedAsset,
                isAssetDetailsPage,
            },
        })
    }

    // Get total deposits count
    const depositsCount = options.reduce((p, c) => p + c.count, 0)

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Withdraw From Privacy Pool"
                    onBack={onBack}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading label="Next" onClick={next} />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                <span className="text-sm text-gray-500">
                    Select the amount that you want to withdraw.
                </span>
                <div className="flex flex-col space-y-1">
                    <label htmlFor="address" className={Classes.inputLabel}>
                        Available Withdrawals: <b>{depositsCount}</b>
                    </label>
                    <VerticalSelect
                        options={options}
                        value={optionIndex}
                        onChange={(option) =>
                            setOptionIndex(options.indexOf(option))
                        }
                        isActive={(option) =>
                            optionIndex === options.indexOf(option)
                        }
                        display={(option) => (
                            <span>
                                &#8226;&#160;&#160;{option.pair.amount}{" "}
                                {option.pair.currency.toUpperCase()}
                                {` (x${option.count})`}
                            </span>
                        )}
                    />
                </div>
            </div>
        </PopupLayout>
    )
}

const CannotWithdrawView: FunctionComponent<{
    preSelectedAsset: TokenWithBalance
    isAssetDetailsPage: boolean
    onBack: () => void
}> = ({ preSelectedAsset, isAssetDetailsPage, onBack }) => {
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Withdraw From Privacy Pool"
                    onBack={onBack}
                />
            }
            footer={
                <PopupFooter>
                    <LinkButton
                        location="/privacy/deposit"
                        classes="w-full"
                        text="Deposit to Privacy Pool"
                        state={{
                            isAssetDetailsPage,
                            preSelectedAsset,
                        }}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col items-center p-6 pt-20 space-y-4">
                <img src={noMoney} alt="no money" className="w-24 h-24" />
                <span className="text-2xl font-bold text-gray-900 font-title">
                    Sorry...
                </span>
                <span className="w-64 text-sm text-center text-gray-700">
                    You don't have any deposits in this wallet. To see your
                    funds here, make a deposit to the privacy pool.
                </span>
            </div>
        </PopupLayout>
    )
}

const UpdatingNotesStateView = (props: any) => {
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Withdraw From Privacy Pool"
                    onBack={props.onBack}
                />
            }
        >
            <div className="flex flex-row items-center justify-center w-full h-full">
                <Spinner size="2rem" />
            </div>
        </PopupLayout>
    )
}

const WithdrawAmountPage = () => {
    const { depositsCount } = useBlankState()!
    const [isLoading, setIsLoading] = useState(false)

    const history = useOnMountHistory()
    const { preSelectedAsset, isAssetDetailsPage } = history.location
        .state as WithdrawPageLocationState

    let baseWithdrawOptions: PairCount = []

    Object.values(depositsCount).map(
        (d) => (baseWithdrawOptions = baseWithdrawOptions!.concat(d))
    )

    // If arriving from asset page, filter the deposits by the preselected asset to display only the corresponding ones.
    if (preSelectedAsset) {
        baseWithdrawOptions = baseWithdrawOptions.filter(
            (d) =>
                d.pair.currency ===
                (preSelectedAsset.token.symbol.toLowerCase() as KnownCurrencies)
        )
    }
    const withdrawOptions = baseWithdrawOptions
        .filter((d) => d.count !== 0)
        .map((d) => ({ ...d, name: `${d.pair.currency}-${d.pair.amount}` }))

    useEffect(() => {
        const updateNotes = async () => {
            try {
                setIsLoading(true)
                await updateNotesSpentState()
            } catch {
                log.debug("Error updating deposits spent state")
            } finally {
                setIsLoading(false)
            }
        }
        updateNotes()
    }, [])

    const onBack = () => {
        history.push({
            pathname: "/privacy",
            state: { isAssetDetailsPage, preSelectedAsset },
        })
    }

    const canWithdraw = withdrawOptions.length > 0

    return isLoading ? (
        <UpdatingNotesStateView onBack={onBack} />
    ) : canWithdraw ? (
        <CanWithdrawView
            options={withdrawOptions}
            onBack={onBack}
            preSelectedAsset={preSelectedAsset}
            isAssetDetailsPage={isAssetDetailsPage}
        />
    ) : (
        <CannotWithdrawView
            onBack={onBack}
            preSelectedAsset={preSelectedAsset}
            isAssetDetailsPage={isAssetDetailsPage}
        />
    )
}

export default WithdrawAmountPage
