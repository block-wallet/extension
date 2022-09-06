import AssetAmountDisplay from "../../components/assets/AssetAmountDisplay"
import ErrorMessage from "../../components/error/ErrorMessage"
import NetworkDisplayBadge from "../../components/chain/NetworkDisplayBadge"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import arrowDown from "../../assets/images/icons/arrow_down_long.svg"
import useLocalStorageState from "../../util/hooks/useLocalStorageState"
import {
    AssetListType,
    AssetSelection,
} from "../../components/assets/AssetSelection"
import { BigNumber } from "ethers"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { GetAmountYupSchema } from "../../util/yup/GetAmountSchema"
import { InferType } from "yup"
import { NetworkSelector } from "../../components/network/NetworkSelector"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { classnames, Classes } from "../../styles"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { formatUnits, parseUnits } from "ethers/lib/utils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
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
} from "../../util/bridgeUtils"
import {
    BridgeQuoteRequest,
    GetBridgeQuoteResponse,
} from "@block-wallet/background/controllers/BridgeController"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { ApproveOperation } from "../transaction/ApprovePage"
import { BridgeAllowanceCheck } from "../../context/commTypes"

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
        bridgeQuote,
        routes,
        amount: defaultAmount,
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
    const selectedAccount = useSelectedAccount()

    // State
    const [error, setError] = useState<string | undefined>(undefined)
    const [inputFocus, setInputFocus] = useState(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [availableRoutes, setAvailableRoutes] = useState<IBridgeRoute[]>(
        routes || []
    )
    const [quote, setQuote] = useState<GetBridgeQuoteResponse | undefined>(
        bridgeQuote
    )

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

    const currentNetwork = availableNetworks[selectedNetwork.toUpperCase()]
    const filteredAvailableNetworks = availableBridgeChains.filter((chain) => {
        for (let i = 0; i < availableRoutes.length; i++) {
            if (
                chain.id === availableRoutes[i].toChainId &&
                chain.id !== currentNetwork.chainId
            ) {
                return true
            }
        }
        return false
    })

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
        trigger: triggerAmountValidation,
        watch,
        formState: { errors },
    } = useForm<InferType<typeof schema>>({
        resolver: yupResolver(schema),
        defaultValues: {
            amount:
                defaultAmount ||
                (bridgeDataState?.bigNumberAmount
                    ? formatUnits(
                          bridgeDataState?.bigNumberAmount?.toString(),
                          bridgeDataState?.token?.decimals
                      )
                    : undefined),
        },
    })

    const watchedAmount = watch("amount")

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
                      showSymbol: true,
                  }
              )
            : undefined
    const isUsingNetworkNativeCurrency =
        selectedToken?.address === nativeToken.token.address
    const maxAmount = selectedTokenBalance
    const isMaxAmountEnabled =
        maxAmount && !(bigNumberAmount && maxAmount.eq(bigNumberAmount))

    //executes when the amount hex changes
    useEffect(() => {
        async function handleChangeAmount() {
            if (selectedToken && Number(watchedAmount)) {
                if (await triggerAmountValidation()) {
                    setBridgeDataState((prev: BridgeState) => ({
                        ...prev,
                        bigNumberAmount: parseUnits(
                            watchedAmount,
                            selectedToken?.decimals
                        ),
                    }))
                }
            } else {
                setBridgeDataState((prev: BridgeState) => ({
                    ...prev,
                    bigNumberAmount: undefined,
                }))
            }
        }
        handleChangeAmount()
    }, [
        watchedAmount,
        selectedToken,
        triggerAmountValidation,
        setBridgeDataState,
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
        const fetchRoutes = async () => {
            setIsLoading(true)

            try {
                const availableRoutes = await getBridgeAvailableRoutes({
                    fromTokenAddress: checkForBridgeNativeAsset(
                        selectedToken!.address
                    ),
                })

                setAvailableRoutes(availableRoutes.routes)
            } catch (error) {
                setError(capitalize(error.message || "Error fetching routes."))
            } finally {
                setIsLoading(false)
            }
        }

        if (!selectedToken) {
            setAvailableRoutes([])
        } else {
            fetchRoutes()
        }
    }, [selectedToken])

    useEffect(() => {
        let isValidFetch = true
        setError(undefined)

        const fetchQuote = async () => {
            setIsLoading(true)

            try {
                const selectedRoute = getRouteForNetwork(
                    availableRoutes,
                    selectedToNetwork!
                )

                const params: BridgeQuoteRequest = {
                    toChainId: selectedRoute.toChainId,
                    fromTokenAddress: selectedRoute.fromTokens[0].address,
                    toTokenAddress: selectedRoute.toTokens[0].address,
                    fromAmount: bigNumberAmount!.toString(),
                    fromAddress: selectedAccount.address,
                    slippage: 0.5,
                }

                const fetchedQuote = await getBridgeQuote(params, true)

                if (isValidFetch) {
                    setQuote(fetchedQuote)
                }
            } catch (error) {
                setError(capitalize(error.message || "Error fetching quoute."))
            } finally {
                setIsLoading(false)
            }
        }

        const validateBeforeFetch = () => {
            if (
                !selectedToken ||
                !selectedToNetwork ||
                !bigNumberAmount ||
                bigNumberAmount.lte(BigNumber.from(0)) ||
                errors.amount
            ) {
                return false
            }
            return true
        }

        const isReadyToFetch = validateBeforeFetch()
        if (isReadyToFetch) {
            fetchQuote()
        }

        return () => {
            isValidFetch = false
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bigNumberAmount,
        errors.amount,
        nativeToken.token.address,
        selectedAddress,
        selectedToken,
        selectedToNetwork,
    ])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Bridge"
                    close="/"
                    keepState
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
                >
                    <div className="flex grow justify-end pr-0.5">
                        <NetworkDisplayBadge
                            network={currentNetwork}
                            truncate
                        />
                    </div>
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={
                            error
                                ? error
                                : quote?.allowance ===
                                  BridgeAllowanceCheck.INSUFFICIENT_ALLOWANCE
                                ? "Approve"
                                : "Review"
                        }
                        disabled={!!(error || !quote)}
                        isLoading={isLoading}
                        onClick={onSubmit}
                        buttonClass={classnames(
                            error && `${Classes.redButton} opacity-100`
                        )}
                    />
                </PopupFooter>
            }
        >
            <div className="flex flex-col p-6">
                <div
                    className={classnames(
                        "flex flex-row",
                        // Error message height
                        !errors.amount?.message && "mb-[22px]"
                    )}
                >
                    {/* Asset */}
                    <div className="flex flex-col w-1/2 pr-1.5">
                        <p className="text-sm text-gray-600 pb-2">
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
                    <div className="flex flex-col w-1/2 pl-1.5">
                        <div className="flex flex-row items-center space-x-1 mb-2">
                            <span
                                className={classnames(
                                    "ml-auto text-sm",
                                    isUsingNetworkNativeCurrency && "invisible",
                                    isMaxAmountEnabled
                                        ? "text-blue-500 hover:text-blue-800 cursor-pointer"
                                        : "text-gray-600 cursor-default"
                                )}
                                onClick={() => {
                                    if (isMaxAmountEnabled) {
                                        const parsedAmount = formatUnits(
                                            maxAmount,
                                            selectedToken?.decimals
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
                                "flex flex-col items-stretch rounded-md p-4 h-[4.5rem] hover:bg-primary-200 w-full",
                                inputFocus
                                    ? "bg-primary-200"
                                    : "bg-primary-100",
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
                                    selectedToken ? selectedToken.symbol : ""
                                }`}
                                autoComplete="off"
                                autoFocus={true}
                                onFocus={() => setInputFocus(true)}
                                onBlur={() => setInputFocus(false)}
                            />
                            <p
                                className={classnames(
                                    "text-xs text-gray-600 mt-1",
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
                    <ErrorMessage error={errors.amount?.message} />
                </div>

                {/* Divider */}
                <div className="pt-6">
                    <hr className="-mx-5" />
                    <div className="flex -translate-y-2/4 justify-center items-center mx-auto rounded-full w-8 h-8 border border-grey-200 bg-white z-10">
                        <img
                            src={arrowDown}
                            className="h-4 w-auto mx-auto"
                            alt="arrow"
                        />
                    </div>
                </div>

                {/* Network selector */}
                <p className="text-sm text-gray-600 pb-2">To Network</p>
                <NetworkSelector
                    topMargin={60}
                    bottomMargin={200}
                    networkList={filteredAvailableNetworks}
                    selectedNetwork={selectedToNetwork}
                    onNetworkChange={(network) => {
                        setQuote(undefined)
                        setBridgeDataState((prev: BridgeState) => ({
                            ...prev,
                            network: network,
                        }))
                    }}
                />

                {/* Asset in destination */}
                {availableRoutes.length
                    ? selectedToNetwork && (
                    <div className="pt-3">
                        <AssetAmountDisplay
                                  asset={
                                      getRouteForNetwork(
                                          availableRoutes,
                                          selectedToNetwork
                                      ).toTokens[0]
                                  }
                                  amount={
                                      quote &&
                                      BigNumber.from(
                                          quote.bridgeParams.params.toAmount
                                      )
                                  }
                              />
                    </div>
                      )
                    : null}
            </div>
        </PopupLayout>
    )
}

export default BridgeSetupPage
