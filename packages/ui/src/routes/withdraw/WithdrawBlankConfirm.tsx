import { useState } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"

import AccountIcon from "../../components/icons/AccountIcon"
import { getAccountColor } from "../../util/getAccountColor"
import blankIcon from "../../assets/images/logo.svg"
import arrow from "../../assets/images/icons/arrow_right_black.svg"
import PopupFooter from "../../components/popup/PopupFooter"
import {
    getSubsequentDepositsCount,
    getWithdrawalFees,
    makeBlankWithdrawal,
    searchTokenInAssetsList,
} from "../../context/commActions"
import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import { useBlankState } from "../../context/background/backgroundHooks"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import Spinner from "../../components/spinner/Spinner"
import { utils } from "ethers"
import { formatHash, formatName } from "../../util/formatAccount"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import ErrorMessage from "../../components/error/ErrorMessage"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useAsync } from "../../util/hooks/useAsync"
import { formatUnits, parseUnits } from "ethers/lib/utils"
import { formatRounded } from "../../util/formatRounded"

import infoIcon from "../../assets/images/icons/info_circle.svg"
import FeesTooltip from "../../components/label/FeesTooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { hasDepositedRecently } from "../../util/hasDepositedRecently"
import { WithdrawTimeFrameWarning } from "./WithdrawTimeFrameWarning"
import { Link } from "react-router-dom"
import CloseIcon from "../../components/icons/CloseIcon"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { DEFAULT_DECIMALS } from "../../util/constants"
import { BigNumber } from "ethers"
import { useGasPriceData } from "../../context/hooks/useGasPriceData"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import GenericTooltip from "../../components/label/GenericTooltip"
import { useAddressBook } from "../../context/hooks/useAddressBook"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { useDepositTokens } from "../../context/hooks/useDepositTokens"
import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import { getValueByKey } from "../../util/objectUtils"

const WITHDRAWAL_ERROR =
    "There was an error.\nCould not initiate the withdrawal."

const WithdrawBlankConfirm = () => {
    const history: any = useOnMountHistory()
    const {
        pair,
        address: accountAddress,
        name: accountName,
        external,
        preSelectedAsset,
        isAssetDetailsPage,
    } = history.location.state as {
        pair: CurrencyAmountPair
        address: string
        name: string
        external: boolean | undefined
        preSelectedAsset: TokenWithBalance
        isAssetDetailsPage: boolean
    }
    const logo = useDepositTokens().find(
        ({ token }) =>
            token.symbol.toLowerCase() === pair.currency.toLowerCase()
    )?.token?.logo

    const [hasHigherFee, setHasHigherFee] = useState(false)
    const [error, setError] = useState("")
    const [tokenDecimals, setTokenDecimals] = useState<number | undefined>()

    const [subsequentDeposits] = useAsync(async () => {
        try {
            return getSubsequentDepositsCount(pair)
        } catch (error) {
            return undefined
        }
    })

    // Same day withdraw warning
    const [recentlyDeposited, setRecentlyDeposited] = useState<
        boolean | undefined
    >(undefined)
    useAsync(async () => {
        if (recentlyDeposited === false) {
            return
        }

        try {
            const recentlyDeposited = await hasDepositedRecently(pair)
            setRecentlyDeposited(recentlyDeposited)
        } catch {
            setRecentlyDeposited(false)
        }
    }, [])

    const state = useBlankState()!
    const network = useSelectedNetwork()
    const { gasPricesLevels } = useGasPriceData()
    const amountInNativeCurrency = toCurrencyAmount(
        utils.parseUnits(pair.amount, network.nativeCurrency.decimals),
        getValueByKey(state.exchangeRates, pair.currency.toUpperCase(), 0),
        network.nativeCurrency.decimals
    )

    const { accounts } = state
    const addressBook = useAddressBook()
    const { status, isOpen, dispatch } = useWaitingDialog()

    const isWithdrawing = status === "loading" && isOpen

    const account =
        accountAddress in accounts
            ? (accounts[accountAddress] as AccountInfo)
            : accountAddress in addressBook
            ? ({
                  name: addressBook[accountAddress].name,
                  address: addressBook[accountAddress].address,
              } as AccountInfo)
            : undefined

    // If we have gasPrice, this mean it's a non EIP-1559 network
    // otherwise we use maxFeePerGas
    const fastGasPrice = gasPricesLevels.fast.gasPrice
        ? gasPricesLevels.fast.gasPrice._hex
        : gasPricesLevels.fast.maxFeePerGas!._hex

    let decimals

    const [estimatedFee, err] = useAsync(async () => {
        const { totalFee, gasFee, relayerFee } = await getWithdrawalFees(pair)
        decimals = tokenDecimals
        if (!decimals) {
            const token = await searchTokenInAssetsList(pair.currency, true)
            decimals = token.length !== 0 ? token[0].decimals : DEFAULT_DECIMALS

            setTokenDecimals(decimals)
        }

        // If no exchange rate available, display zero
        const symbol = pair.currency.toUpperCase()
        const exchangeRate = getValueByKey(state.exchangeRates, symbol, 0)

        if (BigNumber.from(totalFee).gt(parseUnits(pair.amount, decimals))) {
            setError("Fees are higher than the amount to withdraw")
            setHasHigherFee(true)
        } else {
            setHasHigherFee(false)
        }

        return {
            gasFee: formatRounded(formatUnits(gasFee, decimals), 5),
            relayerFee: formatRounded(formatUnits(relayerFee, decimals), 5),
            totalFee: formatRounded(formatUnits(totalFee, decimals), 5),
            totalFeeInNativeCurrency: formatCurrency(
                toCurrencyAmount(totalFee, exchangeRate, decimals),
                {
                    currency: state.nativeCurrency,
                    locale_info: state.localeInfo,
                    showSymbol: true,
                }
            ),
        }
        // Set fastGasPrice as dependency to force update on gas price change
    }, [fastGasPrice])
    const { clear: clearLocationRecovery } = useLocationRecovery()
    const confirm = async () => {
        if (!estimatedFee) return
        if (hasHigherFee) return

        try {
            clearLocationRecovery()
            dispatch({ type: "open", payload: { status: "loading" } })
            // Send amount to address
            await makeBlankWithdrawal(pair, accountAddress)
            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (e) {
            setError(WITHDRAWAL_ERROR)
            dispatch({
                type: "setStatus",
                payload: {
                    status: "error",
                },
            })
        }
    }

    /**
     * Returns fee details to be display on the info tooltip
     * @param values Whether to display the fees or the explanatory text
     */
    const getFeeDetail = () => (
        <div className="flex flex-col font-normal items-start text-xs text-white-500">
            <div className="flex flex-row items-end space-x-7">
                <span>Gas cost:</span>
                <span>
                    {estimatedFee?.gasFee} {pair.currency.toUpperCase()}
                </span>
            </div>
            <div className="flex flex-row items-end space-x-4">
                <span>Relayer fee:</span>{" "}
                <span>
                    {estimatedFee?.relayerFee} {pair.currency.toUpperCase()}
                </span>
            </div>
        </div>
    )

    return recentlyDeposited ? (
        <WithdrawTimeFrameWarning
            onConfirm={() => setRecentlyDeposited(false)}
            onCancel={() => {
                history.push({
                    pathname: "/privacy/withdraw/block/accounts",
                    state: { pair, preSelectedAsset, isAssetDetailsPage },
                })
            }}
            currency={pair.currency}
        />
    ) : recentlyDeposited === false ? (
        <PopupLayout
            header={
                <PopupHeader
                    title="Confirm Withdraw"
                    close={false}
                    onBack={() => {
                        history.push({
                            pathname: external
                                ? "/privacy/withdraw/external"
                                : "/privacy/withdraw/block/accounts",
                            state: {
                                pair,
                                preSelectedAsset,
                                isAssetDetailsPage,
                            },
                        })
                    }}
                >
                    <>
                        <div className="group relative">
                            <a
                                href="https://help.blockwallet.io/hc/en-us/articles/4408778013969-Optimal-Online-Privacy-With-BlockWallet"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <AiFillInfoCircle
                                    size={26}
                                    className="pl-2 text-primary-200 cursor-pointer hover:text-primary-300"
                                />
                            </a>
                            <GenericTooltip
                                className="w-52 p-2"
                                content={
                                    <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                        <div className="flex flex-row items-end space-x-7">
                                            <span>
                                                A short time span since last
                                                deposit, may increase
                                            </span>{" "}
                                        </div>
                                        <div className="flex flex-row items-end space-x-4">
                                            <span>
                                                the risks of deanonymization.
                                                Click on this icon
                                            </span>{" "}
                                        </div>
                                        <div className="flex flex-row items-end space-x-4">
                                            <span>
                                                to learn more on how to stay
                                                anonymous!
                                            </span>{" "}
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                        {!isWithdrawing && (
                            <Link
                                to={"/"}
                                className="p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                                draggable={false}
                            >
                                <CloseIcon />
                            </Link>
                        )}
                    </>
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="submit"
                        onClick={confirm}
                        label="Confirm"
                        disabled={
                            isWithdrawing || !estimatedFee || hasHigherFee
                        }
                        isLoading={isWithdrawing}
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: "Withdrawing...",
                    success: "Congratulations",
                    error: "Error",
                }}
                texts={{
                    loading: "Initiating the withdrawal...",
                    success: "You've initiated the withdrawal.",
                    error: WITHDRAWAL_ERROR,
                }}
                timeout={900}
                clickOutsideToClose={false}
                onDone={() => {
                    if (status === "error") {
                        dispatch({ type: "close" })
                        return
                    }
                    history.push("/")
                }}
            />
            <div className="flex flex-col p-6 space-y-3.5">
                <div className="flex flex-col items-center w-full px-6 py-4 space-y-3 text-sm text-center rounded-md bg-primary-100">
                    <div className="flex flex-row space-x-4">
                        <div className="flex flex-col items-center flex-1 space-y-2">
                            <img
                                src={blankIcon}
                                alt="account"
                                className="w-10 h-10"
                            />
                            <span className="w-20 whitespace-nowrap">
                                Privacy Pool
                            </span>
                        </div>
                        <img src={arrow} alt="arrow" className="w-4 h-4 mt-3" />
                        <div className="flex flex-col items-center flex-1 space-y-2">
                            <AccountIcon
                                className="w-10 h-10"
                                fill={getAccountColor(account?.address || "1")}
                            />
                            <span className="w-20 whitespace-nowrap">
                                {formatName(
                                    account?.name ?? accountName ?? "External"
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold flex flex-col items-center">
                            {logo && (
                                <img
                                    src={logo}
                                    className="w-6 h-6 mb-2"
                                    alt={`${pair.currency.toUpperCase()}`}
                                    title={`${pair.currency.toUpperCase()}`}
                                />
                            )}
                            {pair.amount} {pair.currency.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                            {formatCurrency(amountInNativeCurrency, {
                                currency: state.nativeCurrency,
                                locale_info: state.localeInfo,
                                showSymbol: true,
                            })}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col space-y-3.5 text-sm font-bold">
                    <div className="flex flex-row items-start justify-between">
                        <span>To:</span>
                        <div className="flex flex-row items-center justify-start w-32 space-x-2">
                            <AccountIcon
                                className="w-7 h-7"
                                fill={getAccountColor(account?.address || "1")}
                            />
                            <div className="flex flex-col">
                                <span
                                    title={
                                        account?.name ??
                                        accountName ??
                                        "External"
                                    }
                                >
                                    {formatName(
                                        account?.name ??
                                            accountName ??
                                            "External",
                                        10
                                    )}
                                </span>
                                <span
                                    className="text-xs font-normal text-gray-500"
                                    title={accountAddress}
                                >
                                    {formatHash(accountAddress)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <hr />
                    <div className="flex flex-row items-start justify-between">
                        <div className="flex flex-row space-x-2">
                            <div className="group relative">
                                <img
                                    src={infoIcon}
                                    alt="info"
                                    className="w-3 h-3 mt-1 font-normal text-xs text-gray-500"
                                />
                                <FeesTooltip content={getFeeDetail()} />
                            </div>
                            <span>Fees:</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-sm flex items-center">
                                {estimatedFee ? (
                                    <>
                                        {`${
                                            estimatedFee.totalFee
                                        } ${pair.currency.toUpperCase()}`}
                                        {logo && (
                                            <img
                                                src={logo}
                                                className="w-4 h-4 ml-2"
                                                alt={`${pair.currency.toUpperCase()} logo`}
                                            />
                                        )}
                                    </>
                                ) : err ? (
                                    "-"
                                ) : (
                                    <Spinner />
                                )}
                            </span>
                            <span className="text-xs text-gray-600">
                                {estimatedFee &&
                                    `${estimatedFee.totalFeeInNativeCurrency}`}
                            </span>
                        </div>
                    </div>
                    <hr />
                    <div className="flex flex-col items-start justify-between">
                        <div className="flex flex-row w-full space-x-2">
                            <span className="text-sm font-bold">
                                Subsequent Deposits
                            </span>
                            <div className="group relative">
                                <img
                                    src={infoIcon}
                                    alt="info"
                                    className="w-3 h-3 mt-1 font-normal text-xs text-gray-500"
                                />
                                <GenericTooltip
                                    top
                                    content={
                                        <p className="w-40 font-normal p-1 text-left">
                                            Number of deposits in this pool
                                            after your last deposit.
                                        </p>
                                    }
                                />
                            </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                            <span className="font-bold">
                                {subsequentDeposits || "-"}
                            </span>{" "}
                            <span className="font-normal">
                                {" "}
                                {subsequentDeposits === 1
                                    ? "deposit"
                                    : "deposits"}{" "}
                                after your last deposit
                            </span>
                        </div>
                    </div>
                    <ErrorMessage>{error}</ErrorMessage>
                </div>
            </div>
        </PopupLayout>
    ) : (
        <Spinner />
    )
}

export default WithdrawBlankConfirm
