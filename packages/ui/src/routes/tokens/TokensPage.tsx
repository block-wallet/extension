import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useCallback, useEffect, useState } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { editAccountTokensOrder } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import {
    TokenWithBalance,
    useTokenListWithNativeToken,
} from "../../context/hooks/useTokensList"
import TokenDisplayDragDrop from "../../components/token/TokenDisplayDragDrop"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import { AssetsSortOptions } from "../../util/tokenUtils"
import { AccountTokenOrder } from "@block-wallet/background/controllers/AccountTrackerController"
import { useBlankState } from "../../context/background/backgroundHooks"
import { HiCog, HiInformationCircle, HiSortAscending } from "react-icons/hi"
import { MdDragIndicator } from "react-icons/md"

const TokensPage = () => {
    const { hideSmallBalances } = useBlankState()!
    const history = useOnMountHistory()
    const availableTokens = useTokenListWithNativeToken(
        AssetsSortOptions.CUSTOM,
        hideSmallBalances
    )
    const [tokens, setTokens] = useState<TokenWithBalance[]>([])
    const isFromHomePage = history.location.state?.isFromHomePage ?? false
    const [successOpen, setSuccessOpen] = useState(false)

    const findTokenCard = useCallback(
        (address: string) => {
            const token = tokens.find((n) => n.token.address === address)!

            return {
                token,
                index: tokens.indexOf(token),
            }
        },
        [tokens]
    )

    const moveTokenCard = useCallback(
        (address: string, hoveredOnIndex: number) => {
            const { token, index: draggedIndex } = findTokenCard(address)

            const newTokens = structuredClone(tokens)
            newTokens.splice(draggedIndex, 1) // removing what is being dragged.
            newTokens.splice(hoveredOnIndex, 0, token) // adding the dragged item to the new hovered on index.

            setTokens(newTokens)
        },
        [findTokenCard, tokens]
    )

    function onSuccessfulDrop() {
        let tokensOrder: AccountTokenOrder = {}

        tokens.forEach((token, index) => {
            tokensOrder = { ...tokensOrder, [token.token.address]: index + 1 }
        })

        editAccountTokensOrder(tokensOrder)
    }

    useEffect(() => {
        setTokens(availableTokens)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Assets Order"
                    onBack={() =>
                        history.push(isFromHomePage ? "/" : "/accounts/menu")
                    }
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save Order"
                        onClick={() => setSuccessOpen(true)}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={successOpen}
                title={"Assets Order"}
                message={`Asset order has been successfully saved.`}
                onDone={() => {
                    setSuccessOpen(false)
                    history.push(isFromHomePage ? "/" : "/accounts/menu")
                }}
                timeout={1000}
            />
            <div className="flex flex-col h-full bg-white dark:bg-gray-900">
                {/* Compact Header Section */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-200 dark:border-blue-800">
                            <HiSortAscending className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Customize Asset Order
                            </h2>
                            <div className="flex items-center space-x-4 mt-1">
                                <div className="text-xs">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {tokens.length}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                                        asset{tokens.length !== 1 ? 's' : ''} to order
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Drag Instructions */}
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                    <div className="flex items-center space-x-2">
                        <MdDragIndicator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <div className="text-xs text-amber-800 dark:text-amber-200">
                            <span className="font-medium">Drag & Drop:</span> Use handles to reorder assets
                        </div>
                    </div>
                </div>

                {/* Asset List Area - Main Content */}
                <div className="flex-1 overflow-auto min-h-0 p-4">
                    {tokens.length > 0 ? (
                        <DndProvider backend={HTML5Backend}>
                            <div className="space-y-2">
                                {tokens.map((tokenWithBalance, index) => (
                                    <div key={tokenWithBalance.token.address} className="relative">
                                        {/* Position indicator */}
                                        <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {index + 1}
                                        </div>
                                        <TokenDisplayDragDrop
                                            data={tokenWithBalance.token}
                                            hoverable={true}
                                            findTokenCard={findTokenCard}
                                            moveTokenCard={moveTokenCard}
                                            onSuccessfulDrop={onSuccessfulDrop}
                                            balance={tokenWithBalance.balance}
                                        />
                                    </div>
                                ))}
                            </div>
                        </DndProvider>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                <HiCog className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                                No Assets to Order
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                Add tokens to customize their display order.
                            </p>
                        </div>
                    )}
                </div>

                {/* Compact Information Section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                        <div className="flex items-start space-x-2">
                            <HiInformationCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Tips
                                </h3>
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    Place frequently traded tokens at the top.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default TokensPage
