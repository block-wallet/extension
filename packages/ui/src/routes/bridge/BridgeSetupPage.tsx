import AssetAmountDisplay from "../../components/assets/AssetAmountDisplay"
import ErrorMessage from "../../components/error/ErrorMessage"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import arrowDown from "../../assets/images/icons/arrow_down_long.svg"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import {
    AssetListType,
    AssetSelection,
} from "../../components/assets/AssetSelection"
import { BigNumber } from "@ethersproject/bignumber"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GetAmountYupSchema } from "../../util/yup/GetAmountSchema"
import { InferType } from "yup"
import { NetworkSelector } from "../../components/network/NetworkSelector"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames } from "../../styles"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useCallback } from "react"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useState, useEffect, FunctionComponent } from "react"
import { useTokenBalance } from "../../context/hooks/useTokenBalance"
import { useTokensList } from "../../context/hooks/useTokensList"
import { yupResolver } from "@hookform/resolvers/yup"
import {
    getBridgeAvailableRoutes,
    getBridgeQuote,
} from "../../context/commActions"
import { capitalize } from "../../util/capitalize"
import { BridgeConfirmPageLocalState } from "./BridgeConfirmPage"
import { IBridgeRoute } from "@block-wallet/background/utils/bridgeApi"
import { IChain } from "@block-wallet/background/utils/types/chain"
import {
    checkForBridgeNativeAsset,
    getRouteForNetwork,
    isANotFoundQuote,
} from "../../util/bridgeUtils"
import {
    BridgeQuoteRequest,
    GetBridgeQuoteResponse,
    GetBridgeQuoteNotFoundResponse,
} from "@block-wallet/background/controllers/BridgeController"
import { ApproveOperation } from "../transaction/ApprovePage"
import { BridgeAllowanceCheck, QuoteFeeStatus } from "../../context/commTypes"
import { BridgeNotFoundQuoteDetails } from "../../components/transactions/BridgeNotFoundQuoteDetails"
import { formatRounded } from "../../util/formatRounded"
import FeeDetails from "../../components/FeeDetails"
import ClickableText from "../../components/button/ClickableText"
import BridgeDetails from "../../components/bridge/BridgeDetails"
import { populateBridgeTransaction } from "../../util/bridgeUtils"
import BridgeErrorMessage, { BridgeErrorType } from "./BridgeErrorMessage"
import usePersistedLocalStorageForm from "../../util/hooks/usePersistedLocalStorageForm"
import { secondsToEstimatedMinutes } from "../../util/time"

interface SetupBridgePageLocalState {
    amount?: string
    bridgeQuote?: GetBridgeQuoteResponse
    fromAssetPage?: boolean
    network?: IChain
    routes?: IBridgeRoute[]
    token?: Token
}

interface BridgeState {
    token?: Token
    network?: IChain
    bigNumberAmount?: BigNumber
}

const BridgeSetupPage: FunctionComponent<{}> = () => {
    const history = useOnMountHistory()
    const {
        token,
        network,
        routes,
        amount: historyAmount,
        fromAssetPage,
    } = (history.location.state || {}) as SetupBridgePageLocalState

    const {
        selectedAddress,
        nativeCurrency,
        localeInfo,
        exchangeRates,
        availableNetworks,
        selectedNetwork,
        availableBridgeChains,
    } = useBlankState()!
    const { nativeToken } = useTokensList()

    const [bridgeDetails, setBridgeDetails] = useState<{
        isOpen: boolean
        tab?: "summary" | "fees"
    }>({ isOpen: false })
    // State
    const [routesError, setRoutesError] = useState<string | undefined>(
        undefined
    )
    const [bridgeQuoteError, setBridgeQuoteError] = useState<
        BridgeErrorType | undefined
    >(undefined)

    const [inputFocus, setInputFocus] = useState(false)
    const [isFetchingRoutes, setIsFetchingRoutes] = useState<boolean>(false)
    const [isFetchingQuote, setisFetchingQuote] = useState<boolean>(false)
    const [availableRoutes, setAvailableRoutes] = useState<IBridgeRoute[]>(
        routes || []
    )
    const [quote, setQuote] = useState<GetBridgeQuoteResponse | undefined>(
        undefined
    )
    const [quoteNotFoundErrors, setQuoteNotFoundErrors] = useState<
        GetBridgeQuoteNotFoundResponse | undefined
    >(undefined)

    const [bridgeDataState, setBridgeDataState] =
        useLocalStorageState<BridgeState>("bridge.form", {
            initialValue: {
                token: token ? token : nativeToken.token,
                network,
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
        })

    const selectedTokenBalance = useTokenBalance(bridgeDataState.token)

    const {
        token: selectedToken,
        network: selectedToNetwork,
        bigNumberAmount,
    } = bridgeDataState

    // Validation
    const schema = GetAmountYupSchema(selectedToken, selectedTokenBalance)
    const {
        register,
        setValue,
        clearErrors,
        setFocus,
        trigger: triggerAmountValidation,
        watch,
        formState: { errors },
    } = usePersistedLocalStorageForm<InferType<typeof schema>>(
        {
            key: "bridges.amount.form",
        },
        {
            resolver: yupResolver(schema),
            defaultValues: {
                amount:
                    (bridgeDataState?.bigNumberAmount
                        ? formatUnits(
                            bridgeDataState?.bigNumberAmount?.toString(),
                            bridgeDataState?.token?.decimals
                        )
                        : undefined) || historyAmount,
            },
        }
    )

    const watchedAmount = watch("amount")

    const focusAmountInput = () => {
        setFocus("amount")
    }
    const currentNetwork = availableNetworks[selectedNetwork.toUpperCase()]
    const isUsingNetworkNativeCurrency =
        selectedToken?.address === nativeToken.token.address
    const maxAmount = selectedTokenBalance
    const isMaxAmountEnabled =
        maxAmount && !(bigNumberAmount && maxAmount.eq(bigNumberAmount))
    const selectedRoute = getRouteForNetwork(availableRoutes, selectedToNetwork)
    const availbleChainsId = availableRoutes.map((route) => route.toChainId)
    const filteredAvailableNetworks = availableBridgeChains.filter((chain) => {
        if (chain.id === currentNetwork.chainId) {
            return false
        }
        return availbleChainsId.includes(chain.id)
    })
    const [showBridgeNotFoundQuoteDetails, setShowBridgeNotFoundQuoteDetails] =
        useState<boolean>(false)

    const formattedAmount =
        selectedToken && bigNumberAmount
            ? formatCurrency(
                toCurrencyAmount(
                    bigNumberAmount,
                    exchangeRates[selectedToken.symbol.toUpperCase()],
                    selectedToken.decimals
                ),
                {
                    currency: nativeCurrency,
                    locale_info: localeInfo,
                    returnNonBreakingSpace: false,
                    showSymbol: false,
                }
            )
            : undefined

    //executes when the amount hex changes
    useEffect(() => {
        async function handleChangeAmount() {
            clearErrors()
            if (selectedToken && Number(watchedAmount)) {
                if (await triggerAmountValidation()) {
                    return setBridgeDataState((prev: BridgeState) => ({
                        ...prev,
                        bigNumberAmount: parseUnits(
                            watchedAmount,
                            selectedToken?.decimals
                        ),
                    }))
                }
            }

            setBridgeDataState((prev: BridgeState) => ({
                ...prev,
                bigNumberAmount: undefined,
            }))
        }
        handleChangeAmount()
    }, [
        watchedAmount,
        selectedToken,
        selectedToken?.address,
        triggerAmountValidation,
        setBridgeDataState,
        clearErrors,
    ])

    const onSubmit = () => {
        if (
            !selectedToken ||
            !bigNumberAmount ||
            !quote ||
            !selectedToNetwork
        ) {
            return
        }

        const nextViewState: BridgeConfirmPageLocalState = {
            amount: watchedAmount,
            bridgeQuote: quote,
            network: selectedToNetwork,
            routes: availableRoutes,
            token: selectedToken,
            fromAssetPage,
        }

        if (quote.allowance === BridgeAllowanceCheck.ENOUGH_ALLOWANCE) {
            history.push({
                pathname: "/bridge/confirm",
                state: nextViewState,
            })
        } else {
            history.push({
                pathname: "/transaction/approve",
                state: {
                    assetAddress: selectedToken.address,
                    minAllowance: bigNumberAmount,
                    approveOperation: ApproveOperation.BRIDGE,
                    nextLocationState: nextViewState,
                },
            })
        }
    }

    const onUpdateAmount = (value: string) => {
        // Clear the quote first
        setQuote(undefined)
        const parsedAmount = value
            .replace(/[^0-9.,]/g, "")
            .replace(",", ".")
            .replace(/(\..*?)\..*/g, "$1")
        setValue("amount", parsedAmount)
    }

    useEffect(() => {
        let isValidFetch = true
        setRoutesError(undefined)
        setBridgeQuoteError(undefined)
        const fetchRoutes = async () => {
            setIsFetchingRoutes(true)
            try {
                const routesRes = await getBridgeAvailableRoutes({
                    fromTokenAddress: checkForBridgeNativeAsset(
                        selectedToken!.address
                    ),
                })

                if (isValidFetch) {
                    const { routes } = routesRes
                    if (!routes.length) {
                        setRoutesError(
                            "There are no routes available for the selected asset."
                        )
                    }
                    setAvailableRoutes(routes)

                    //check if network is still valid.
                    if (
                        selectedToNetwork &&
                        !routes.some(
                            (route) => route.toChainId === selectedToNetwork?.id
                        )
                    ) {
                        setBridgeDataState((prev: BridgeState) => ({
                            ...prev,
                            network: undefined,
                        }))
                    }
                    setIsFetchingRoutes(false)
                }
            } catch (error) {
                if (isValidFetch) {
                    setRoutesError(
                        capitalize(error.message || "Error fetching routes.")
                    )
                    setAvailableRoutes([])
                    setIsFetchingRoutes(false)
                }
            }
        }

        if (selectedToken) {
            fetchRoutes()
        } else {
            setAvailableRoutes([])
            setIsFetchingRoutes(false)
        }

        return () => {
            isValidFetch = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedToken])

    useEffect(() => {
        let isValidFetch = true
        setBridgeQuoteError(undefined)
        const fetchQuote = async () => {
            setisFetchingQuote(true)

            try {
                const params: BridgeQuoteRequest = {
                    toChainId: selectedRoute!.toChainId,
                    fromTokenAddress: selectedRoute!.fromTokens[0].address,
                    toTokenAddress: selectedRoute!.toTokens[0].address,
                    fromAmount: bigNumberAmount!.toString(),
                    fromAddress: selectedAddress,
                }

                const fetchedQuote = await getBridgeQuote(params, true)
                if (isValidFetch) {
                    if (isANotFoundQuote(fetchedQuote)) {
                        setBridgeQuoteError(BridgeErrorType.QUOTE_NOT_FOUND)
                        setQuoteNotFoundErrors(
                            fetchedQuote as GetBridgeQuoteNotFoundResponse
                        )
                    } else {
                        const validQuote =
                            fetchedQuote as GetBridgeQuoteResponse
                        setQuote(validQuote)
                        if (validQuote.quoteFeeStatus !== QuoteFeeStatus.OK) {
                            setBridgeQuoteError(
                                BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES
                            )
                        }
                    }
                    setisFetchingQuote(false)
                }
            } catch (error) {
                if (isValidFetch) {
                    setBridgeQuoteError(BridgeErrorType.OTHER)
                    setisFetchingQuote(false)
                }
            }
        }

        if (
            selectedRoute &&
            selectedAddress &&
            bigNumberAmount &&
            bigNumberAmount.gt(BigNumber.from(0)) &&
            !errors.amount
        ) {
            fetchQuote()
        } else {
            setisFetchingQuote(false)
        }

        return () => {
            isValidFetch = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bigNumberAmount, errors.amount, selectedAddress, selectedRoute])

    const bridgeFeeSummary = quote?.bridgeParams.params.feeCosts.reduce(
        (feeDetails, fee) => {
            if (feeDetails) {
                feeDetails = feeDetails.concat(" + ")
            }
            return feeDetails.concat(
                `${formatRounded(
                    formatUnits(fee.total, fee.token.decimals),
                    4
                )}
                ${fee.token.symbol}`
            )
        },
        ""
    )

    const requestQuote = () => {
        // Implementation of requestQuote function - simplified for now
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Bridge"
                    close="/"
                    keepState
                    networkIndicator
                    onBack={() =>
                        fromAssetPage
                            ? history.push({
                                pathname: "/asset/details",
                                state: {
                                    address: selectedToken?.address,
                                },
                            })
                            : history.push("/home")
                    }
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={
                            quote?.allowance ===
                                BridgeAllowanceCheck.INSUFFICIENT_ALLOWANCE
                                ? "Approve"
                                : "Review"
                        }
                        disabled={!!(routesError || bridgeQuoteError || !quote)}
                        isLoading={isFetchingRoutes || isFetchingQuote}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            {quote && (
                <BridgeDetails
                    tab={bridgeDetails.tab}
                    open={bridgeDetails.isOpen}
                    transaction={populateBridgeTransaction(quote)}
                    onClose={() => setBridgeDetails({ isOpen: false })}
                />
            )}

            <div className="flex flex-col p-6">
                <div
                    className={classnames(
                        "flex flex-col space-y-4",
                        // Error message height
                        !errors.amount?.message && "mb-6"
                    )}
                >
                    {/* Asset */}
                    <div className="flex flex-col w-full">
                        <p className="text-[13px] font-medium text-primary-grey-dark dark:text-gray-300 pb-2">
                            Bridge Asset
                        </p>
                        <AssetSelection
                            selectedAssetList={AssetListType.DEFAULT}
                            selectedAsset={
                                selectedToken && selectedTokenBalance
                                    ? {
                                        token: selectedToken,
                                        balance: selectedTokenBalance,
                                    }
                                    : undefined
                            }
                            onAssetChange={(asset) => {
                                setQuote(undefined)
                                setBridgeDataState((prev: BridgeState) => ({
                                    ...prev,
                                    token: asset.token,
                                }))
                            }}
                            topMargin={100}
                            bottomMargin={60}
                            dropdownWidth="w-[309px]"
                            assetBalanceClassName="w-24"
                            addTokenState={{
                                redirectTo: "/bridge/afterAddToken",
                                token: selectedToken,
                            }}
                        />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col w-full">
                        <p className="text-[13px] font-medium text-primary-grey-dark dark:text-gray-300 pb-2">
                            Amount
                        </p>
                        <div className="flex flex-row items-start space-x-2">
                            <div className="flex flex-col flex-1 min-w-0">
                                <input
                                    type="text"
                                    {...register("amount", {
                                        onChange: (e) => {
                                            const value = e.target.value
                                            if (selectedToken) {
                                                setBridgeDataState(
                                                    (prev: BridgeState) => ({
                                                        ...prev,
                                                        bigNumberAmount: value
                                                            ? parseUnits(
                                                                value,
                                                                selectedToken.decimals
                                                            )
                                                            : undefined,
                                                    })
                                                )
                                            }
                                        },
                                        onBlur: () => {
                                            setInputFocus(false)
                                        },
                                    })}
                                    onFocus={() => setInputFocus(true)}
                                    className={classnames(
                                        "text-sm font-medium p-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200 w-full",
                                        "focus:outline-none focus:ring-2 focus:ring-primary-blue-default dark:focus:ring-blue-500 focus:border-transparent",
                                        errors.amount?.message &&
                                        "border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400"
                                    )}
                                    placeholder="0.00"
                                />
                                {formattedAmount && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                                        ≈ {formattedAmount}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isMaxAmountEnabled && selectedToken) {
                                            setValue(
                                                "amount",
                                                formatUnits(
                                                    isUsingNetworkNativeCurrency
                                                        ? maxAmount
                                                        : maxAmount,
                                                    selectedToken.decimals
                                                )
                                            )
                                            setBridgeDataState(
                                                (prev: BridgeState) => ({
                                                    ...prev,
                                                    bigNumberAmount: maxAmount,
                                                })
                                            )
                                        }
                                    }}
                                    className={classnames(
                                        "px-3 py-3 text-xs font-medium rounded-md transition-colors duration-200 whitespace-nowrap",
                                        isMaxAmountEnabled
                                            ? "bg-primary-blue-default dark:bg-blue-600 text-white hover:bg-primary-blue-dark dark:hover:bg-blue-700"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                    )}
                                    disabled={!isMaxAmountEnabled}
                                >
                                    Max
                                </button>
                            </div>
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

                {/* Divider */}
                <div className="pt-3 h-8 mb-2">
                    <hr className="-mx-5 border-gray-200 dark:border-gray-700" />
                    <div className="flex -translate-y-2/4 justify-center items-center mx-auto rounded-full w-8 h-8 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
                        <img
                            src={arrowDown}
                            className="h-4 w-auto mx-auto"
                            alt="arrow"
                        />
                    </div>
                </div>

                {/* Network selector */}
                <p className="text-[13px] font-medium text-primary-grey-dark dark:text-gray-300 pb-2">
                    To Network
                </p>
                <NetworkSelector
                    topMargin={60}
                    bottomMargin={200}
                    networkList={filteredAvailableNetworks}
                    isLoading={isFetchingRoutes}
                    loadingText="Loading networks..."
                    emptyText="Select network"
                    selectedNetwork={
                        selectedToNetwork &&
                            availbleChainsId.includes(selectedToNetwork.id)
                            ? selectedToNetwork
                            : undefined
                    }
                    onNetworkChange={(network) => {
                        setQuote(undefined)
                        setBridgeDataState((prev: BridgeState) => ({
                            ...prev,
                            network: network,
                        }))
                    }}
                />

                {/* Asset in destination */}
                {selectedRoute && !isFetchingRoutes && (
                    <div className="pt-3">
                        <AssetAmountDisplay
                            asset={selectedRoute.toTokens[0]}
                            amount={
                                quote &&
                                BigNumber.from(
                                    quote.bridgeParams.params.toAmount
                                )
                            }
                        />
                    </div>
                )}
                {/* Bridge fees, details and estimated duration */}
                {quote ? (
                    <>
                        <div className="flex flex-row items-center justify-between py-2">
                            <FeeDetails
                                summary={`Bridge fees: ${bridgeFeeSummary}`}
                            />
                            <ClickableText
                                onClick={() => {
                                    setBridgeDetails({
                                        isOpen: true,
                                        tab: "fees",
                                    })
                                }}
                                className="!text-primary-blue-default dark:!text-blue-400 hover:!text-primary-blue-dark dark:hover:!text-blue-300 transition-colors duration-200"
                            >
                                Details
                            </ClickableText>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-row justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Estimated Time
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {secondsToEstimatedMinutes(
                                            quote.bridgeParams.params
                                                .estimatedDurationInSeconds
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Status
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Ready to bridge
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Quote valid
                            </span>
                            <div className="text-right">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {isFetchingQuote ? "Updating..." : "Current"}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    isFetchingQuote && (
                        <div className="flex flex-row items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue-default dark:border-blue-400"></div>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                Getting quote...
                            </span>
                        </div>
                    )
                )}

                {bridgeQuoteError && (
                    <div className="mt-4">
                        <BridgeErrorMessage
                            type={bridgeQuoteError}
                            onClickDetails={(type) => {
                                if (
                                    type ===
                                    BridgeErrorType.INSUFFICIENT_BALANCE_TO_COVER_FEES
                                ) {
                                    setBridgeDetails({
                                        isOpen: true,
                                        tab: "fees",
                                    })
                                } else if (
                                    type === BridgeErrorType.QUOTE_NOT_FOUND
                                ) {
                                    setShowBridgeNotFoundQuoteDetails(true)
                                }
                            }}
                        />
                    </div>
                )}
                {!!quoteNotFoundErrors && (
                    <BridgeNotFoundQuoteDetails
                        open={showBridgeNotFoundQuoteDetails}
                        onClose={() => setShowBridgeNotFoundQuoteDetails(false)}
                        details={quoteNotFoundErrors}
                    />
                )}
                {routesError && !bridgeQuoteError && (
                    <ErrorMessage className="mt-4 !text-red-500 dark:!text-red-400">
                        {routesError}
                    </ErrorMessage>
                )}
            </div>
        </PopupLayout>
    )
}

export default BridgeSetupPage
