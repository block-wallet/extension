import ErrorMessage from "../../components/error/ErrorMessage"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import RateUpdateDialog from "../../components/swaps/RateUpdateDialog"
import { useState, useEffect, useMemo } from "react"
import swapIcon from "../../assets/images/icons/swap.svg"
import {
    checkExchangeAllowance,
    getExchangeQuote,
} from "../../context/commActions"
import {
    AssetListType,
    AssetSelection,
} from "../../components/assets/AssetSelection"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { BASE_SWAP_FEE, SWAP_QUOTE_REFRESH_TIMEOUT } from "../../util/constants"
import { InferType } from "yup"
import { SwapConfirmPageLocalState } from "./SwapConfirmPage"
import { SwapQuoteResponse } from "@block-wallet/background/controllers/SwapController"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames } from "../../styles"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useForm } from "react-hook-form"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useTokensList } from "../../context/hooks/useTokensList"
import { yupResolver } from "@hookform/resolvers/yup"
import useCountdown from "../../util/hooks/useCountdown"
import { formatNumberLength } from "../../util/formatNumberLength"
import RefreshLabel from "../../components/swaps/RefreshLabel"
import { capitalize } from "../../util/capitalize"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import { useCallback } from "react"
import { useTokenBalance } from "../../context/hooks/useTokenBalance"
import { GetAmountYupSchema } from "../../util/yup/GetAmountSchema"
import { ApproveOperation } from "../transaction/ApprovePage"
import { DEFAULT_EXCHANGE_TYPE } from "../../util/exchangeUtils"

interface SwapPageLocalState {
    fromToken?: Token
    swapQuote?: SwapQuoteResponse
    toToken?: Token
    fromAssetPage?: boolean
    amount?: string
}

interface SwapState {
    tokenFrom?: Token
    tokenTo?: Token
    bigNumberAmount?: BigNumber
}

const SwapPage = () => {
    const history = useOnMountHistory()
    const {
        fromToken,
        swapQuote,
        toToken,
        amount: defaultAmount,
        fromAssetPage,
    } = (history.location.state || {}) as SwapPageLocalState
    const [timeoutStart, setTimeoutStart] = useState<number | undefined>(
        undefined
    )
    const { value: remainingSeconds } = useCountdown(
        timeoutStart,
        SWAP_QUOTE_REFRESH_TIMEOUT
    )

    const { selectedAddress, nativeCurrency, localeInfo, exchangeRates } =
        useBlankState()!

    const { nativeToken } = useTokensList()

    // State
    const [error, setError] = useState<string | undefined>(undefined)
    const [inputFocus, setInputFocus] = useState(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [hasAllowance, setHasAllowance] = useState<boolean>(true)
    const [quote, setQuote] = useState<SwapQuoteResponse | undefined>(swapQuote)
    const [canSwitchInputs, setCanSwitchInputs] = useState<boolean>(true)

    const [swapDataState, setSwapDataState] = useLocalStorageState<SwapState>(
        "swaps.form",
        {
            initialValue: {
                tokenFrom: fromToken ? fromToken : nativeToken.token,
                tokenTo: toToken,
                bigNumberAmount: undefined,
            },
            deserializer: useCallback((rawData: any) => {
                return {
                    ...rawData,
                    bigNumberAmount: rawData.bigNumberAmount
                        ? BigNumber.from(rawData.bigNumberAmount)
                        : undefined,
                }
            }, []),
        }
    )

    const tokenFromBalance = useTokenBalance(swapDataState.tokenFrom)

    const { tokenFrom, tokenTo, bigNumberAmount } = swapDataState

    // Validation
    const schema = GetAmountYupSchema(tokenFrom, tokenFromBalance)
    const {
        register,
        setValue,
        trigger: triggerAmountValidation,
        watch,
        clearErrors,
        formState: { errors },
    } = useForm<InferType<typeof schema>>({
        resolver: yupResolver(schema),
        defaultValues: {
            amount:
                defaultAmount ||
                (swapDataState?.bigNumberAmount
                    ? formatUnits(
                          swapDataState?.bigNumberAmount?.toString(),
                          swapDataState?.tokenFrom?.decimals
                      )
                    : undefined),
        },
    })

    const watchedAmount = watch("amount")

    const formattedAmount =
        tokenFrom && bigNumberAmount
            ? formatCurrency(
                  toCurrencyAmount(
                      bigNumberAmount,
                      exchangeRates[tokenFrom.symbol.toUpperCase()],
                      tokenFrom.decimals
                  ),
                  {
                      currency: nativeCurrency,
                      locale_info: localeInfo,
                      returnNonBreakingSpace: false,
                      showSymbol: false,
                  }
              )
            : undefined
    const isUsingNetworkNativeCurrency =
        tokenFrom?.address === nativeToken.token.address
    const maxAmount = tokenFromBalance
    const isMaxAmountEnabled =
        maxAmount && !(bigNumberAmount && maxAmount.eq(bigNumberAmount))

    //executes when the amount hex changes
    useEffect(() => {
        async function handleChangeAmount() {
            if (tokenFrom && Number(watchedAmount)) {
                if (await triggerAmountValidation()) {
                    setSwapDataState((prev: SwapState) => ({
                        ...prev,
                        bigNumberAmount: parseUnits(
                            watchedAmount,
                            tokenFrom?.decimals
                        ),
                    }))
                }
            } else {
                setSwapDataState((prev: SwapState) => ({
                    ...prev,
                    bigNumberAmount: undefined,
                }))
            }
        }
        handleChangeAmount()
    }, [watchedAmount, tokenFrom, triggerAmountValidation, setSwapDataState])

    const onSubmit = () => {
        if (!quote || !tokenFrom || !bigNumberAmount) {
            return
        }

        if (hasAllowance) {
            history.push({
                pathname: "/swap/confirm",
                state: {
                    fromToken: tokenFrom,
                    fromTokenBalance: tokenFromBalance,
                    swapQuote: quote,
                    toToken: tokenTo,
                    amount: watchedAmount,
                } as SwapConfirmPageLocalState,
            })
        } else {
            history.push({
                pathname: "/transaction/approve",
                state: {
                    assetAddress: tokenFrom.address,
                    minAllowance: bigNumberAmount,
                    approveOperation: ApproveOperation.SWAP,
                    nextLocationState: {
                        fromToken: tokenFrom,
                        fromTokenBalance: tokenFromBalance,
                        swapQuote: quote,
                        toToken: tokenTo,
                        amount: watchedAmount,
                    } as SwapConfirmPageLocalState,
                },
            })
        }
    }

    const onUpdateAmount = (value: string) => {
        //clear the quote first
        setQuote(undefined)
        const parsedAmount = value
            .replace(/[^0-9.,]/g, "")
            .replace(",", ".")
            .replace(/(\..*?)\..*/g, "$1")
        setValue("amount", parsedAmount)
    }

    const switchInputs = () => {
        setQuote(undefined)
        setError(undefined)
        clearErrors()
        let nextSwapState: SwapState = {
            ...swapDataState,
            //Update tokenTo data
            tokenTo: tokenFrom || undefined,
            //Update token from data
            tokenFrom: tokenTo || undefined,
            bigNumberAmount: undefined,
        }

        if (tokenFrom) {
            if (quote && tokenTo) {
                const toTokenAmountBN = formatUnits(
                    quote.toTokenAmount,
                    tokenTo.decimals
                )
                setValue("amount", toTokenAmountBN.toString())
            } else {
                setValue("amount", "0")
            }
        }
        setSwapDataState((prev: SwapState) => ({
            ...prev,
            ...nextSwapState,
        }))
    }

    useEffect(() => {
        let intervalTimeoutRef: NodeJS.Timeout | null = null
        let isValidFetch = true
        setError(undefined)
        async function fetchQuote() {
            setHasAllowance(true)
            setIsLoading(true)
            setCanSwitchInputs(false)
            if (
                tokenFrom!.address.toLowerCase() !==
                nativeToken.token.address.toLowerCase()
            ) {
                try {
                    const allowanceCheck = await checkExchangeAllowance(
                        selectedAddress,
                        bigNumberAmount!,
                        DEFAULT_EXCHANGE_TYPE,
                        tokenFrom!.address
                    )

                    setHasAllowance(allowanceCheck)
                } catch (error) {
                    setError("Error checking allowance")
                }
            }

            try {
                const quote = await getExchangeQuote(DEFAULT_EXCHANGE_TYPE, {
                    fromToken: tokenFrom!,
                    toToken: tokenTo!,
                    amount: bigNumberAmount!.toString(),
                    fromAddress: selectedAddress,
                })
                if (isValidFetch) {
                    setQuote(quote)
                }
            } catch (error) {
                setError(capitalize(error.message || "Error fetching quote."))
            } finally {
                setCanSwitchInputs(true)
                setIsLoading(false)
                if (isValidFetch) {
                    setTimeoutStart(new Date().getTime())
                }
            }
        }

        function validateBeforeFetch() {
            if (
                !tokenFrom ||
                !tokenTo ||
                !bigNumberAmount ||
                bigNumberAmount.lte(BigNumber.from(0)) ||
                errors.amount
            ) {
                return false
            }
            if (
                tokenFrom.address.toLowerCase() ===
                tokenTo.address.toLowerCase()
            ) {
                setError("Can't swap the same asset")
                return false
            }

            return true
        }

        const isReadyToFetch = validateBeforeFetch()
        if (isReadyToFetch) {
            fetchQuote()
            intervalTimeoutRef = setInterval(
                fetchQuote,
                SWAP_QUOTE_REFRESH_TIMEOUT
            )
        } else {
            setTimeoutStart(undefined)
        }

        return () => {
            isValidFetch = false
            intervalTimeoutRef && clearInterval(intervalTimeoutRef)
        }
    }, [
        bigNumberAmount,
        errors.amount,
        nativeToken.token.address,
        selectedAddress,
        tokenFrom,
        tokenTo,
    ])

    const remainingSuffix = Math.ceil(remainingSeconds!)
        ? `${Math.floor(remainingSeconds!)}s`
        : null

    const rate = useMemo(() => {
        return quote?.toTokenAmount
            ? BigNumber.from(quote?.toTokenAmount)
            : undefined
    }, [quote?.toTokenAmount])

    const swapFee = quote
        ? `${formatNumberLength(
              formatUnits(
                  BigNumber.from(quote.fromTokenAmount)
                      .mul(BASE_SWAP_FEE * 10)
                      .div(1000),
                  quote.fromToken.decimals
              ),
              8
          )} ${quote.fromToken.symbol}`
        : undefined

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Swap"
                    close="/"
                    networkIndicator
                    keepState
                    onBack={() => {
                        history.push(
                            fromAssetPage
                                ? {
                                      pathname: "/asset/details",
                                      state: {
                                          address: fromToken?.address,
                                      },
                                  }
                                : { pathname: "/home" }
                        )
                    }}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={hasAllowance ? "Review" : "Approve"}
                        disabled={!!(error || !quote)}
                        isLoading={isLoading}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            {rate && tokenTo && quote ? (
                <RateUpdateDialog
                    key={`${tokenTo.address}-${tokenFrom?.address}-${bigNumberAmount?._hex}`}
                    assetName={tokenTo.symbol}
                    assetDecimals={tokenTo.decimals}
                    rate={rate}
                />
            ) : null}
            <div className="flex flex-col p-6 h-full">
                <div
                    className={classnames(
                        "flex flex-row",
                        // Error message height
                        !errors.amount?.message && "mb-5"
                    )}
                >
                    {/* Asset */}
                    <div className="flex flex-col space w-1/2 pr-1.5">
                        <p className="mb-2 text-[13px] font-medium text-primary-grey-dark">
                            Swap From
                        </p>
                        <AssetSelection
                            selectedAssetList={AssetListType.DEFAULT}
                            selectedAsset={
                                tokenFrom && tokenFromBalance
                                    ? {
                                          token: tokenFrom,
                                          balance: tokenFromBalance,
                                      }
                                    : undefined
                            }
                            onAssetChange={(asset) => {
                                //Before assigning 'from' we check if it is not the same as 'to'. If that is the case we swap the inputs
                                if (asset.token.address === tokenTo?.address) {
                                    switchInputs()
                                } else {
                                    setQuote(undefined)
                                    setError(undefined)
                                    setSwapDataState((prev: SwapState) => ({
                                        ...prev,
                                        tokenFrom: asset.token,
                                    }))
                                }
                            }}
                            topMargin={100}
                            bottomMargin={60}
                            dropdownWidth="w-[309px]"
                            assetBalanceClassName="w-24"
                            addTokenState={{
                                redirectTo: "/swap/afterAddToken",
                                tokenTarget: "from",
                                fromToken: tokenFrom,
                                toToken: tokenTo,
                            }}
                        />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col w-1/2 pl-1.5">
                        <div className="flex flex-row items-center space-x-1 mb-2">
                            <span
                                className={classnames(
                                    "ml-auto text-sm",
                                    isUsingNetworkNativeCurrency && "invisible",
                                    isMaxAmountEnabled
                                        ? "text-primary-blue-default hover:text-primary-blue-hover cursor-pointer"
                                        : "text-primary-grey-dark cursor-default"
                                )}
                                onClick={() => {
                                    if (isMaxAmountEnabled) {
                                        const parsedAmount = formatUnits(
                                            maxAmount,
                                            tokenFrom?.decimals
                                        )
                                        onUpdateAmount(parsedAmount)
                                    }
                                }}
                            >
                                Max
                            </span>
                        </div>
                        <div
                            className={classnames(
                                "flex flex-col items-stretch rounded-md p-4 h-[4rem] hover:bg-primary-grey-hover w-full",
                                inputFocus
                                    ? "bg-primary-grey-hover"
                                    : "bg-primary-grey-default",
                                errors.amount
                                    ? "border-red-400"
                                    : "border-opacity-0 border-transparent"
                            )}
                        >
                            <input
                                {...register("amount")}
                                id="amount"
                                name="amount"
                                onChange={(e) => {
                                    onUpdateAmount(e.target.value)
                                }}
                                maxLength={80}
                                className="p-0 text-base bg-transparent border-none font-semibold -mt-0.5"
                                placeholder={`0.0 ${
                                    tokenFrom ? tokenFrom.symbol : ""
                                }`}
                                autoComplete="off"
                                autoFocus={true}
                                onFocus={() => setInputFocus(true)}
                                onBlur={() => setInputFocus(false)}
                            />
                            <p
                                className={classnames(
                                    "text-xs text-primary-grey-dark",
                                    !formattedAmount && "hidden"
                                )}
                            >
                                {formattedAmount}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className={classnames(
                        "mt-1",
                        !errors.amount?.message && "hidden"
                    )}
                >
                    <ErrorMessage>{errors.amount?.message}</ErrorMessage>
                </div>

                {/* Switch Inputs */}
                <div className="pt-6">
                    <hr className="-mx-5" />
                    <button
                        type="button"
                        className="flex -translate-y-2/4 justify-center items-center mx-auto rounded-full w-8 h-8 border border-grey-200 bg-white z-10 cursor-pointer"
                        onClick={switchInputs}
                        disabled={!canSwitchInputs}
                    >
                        <img
                            src={swapIcon}
                            className="h-4 w-auto mx-auto"
                            alt="swap"
                        />
                    </button>
                </div>

                <p className="text-[13px] font-medium text-primary-grey-dark mb-2">
                    Swap To
                </p>
                <AssetSelection
                    displayIcon
                    selectedAssetList={AssetListType.DEFAULT}
                    selectedAsset={
                        tokenTo
                            ? {
                                  token: tokenTo,
                                  balance: BigNumber.from(0),
                              }
                            : undefined
                    }
                    onAssetChange={(asset) => {
                        //Before assigning 'to' we check if it is not the same as 'from'. If that is the case we swap the inputs
                        if (asset.token.address === tokenFrom?.address) {
                            switchInputs()
                        } else {
                            setQuote(undefined)
                            setError(undefined)
                            setSwapDataState((prev: SwapState) => ({
                                ...prev,
                                tokenTo: asset.token,
                            }))
                        }
                    }}
                    customAmount={BigNumber.from(quote?.toTokenAmount || 0)}
                    topMargin={50}
                    bottomMargin={200}
                    addTokenState={{
                        redirectTo: "/swap/afterAddToken",
                        tokenTarget: "to",
                        fromToken: tokenFrom,
                        toToken: tokenTo,
                    }}
                />
                {swapFee && (
                    <div className="flex items-center text-xs text-primary-grey-dark pt-0.5 mr-1 mt-2">
                        <span>{`BlockWallet fee (${BASE_SWAP_FEE}%): ${swapFee}`}</span>
                    </div>
                )}
                <div className="h-full flex flex-col justify-end space-y-3">
                    {error && (
                        <div>
                            <ErrorMessage>{error}</ErrorMessage>
                        </div>
                    )}
                    {remainingSuffix && (
                        <div className="flex flex-col justify-end">
                            <RefreshLabel value={remainingSuffix} />
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default SwapPage
