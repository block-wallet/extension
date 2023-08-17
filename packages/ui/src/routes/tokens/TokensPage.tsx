import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useCallback, useEffect, useState } from "react"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { editAccountTokensOrder } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { RequestEditAccountTokensOrder } from "@block-wallet/background/utils/types/communication"
import {
    TokenWithBalance,
    useTokenListWithNativeToken,
} from "../../context/hooks/useTokensList"
import TokenDisplayDragDrop from "../../components/token/TokenDisplayDragDrop"

const TokensPage = () => {
    const history = useOnMountHistory()
    const availableTokens = useTokenListWithNativeToken("CUSTOM")
    const [tokens, setTokens] = useState<TokenWithBalance[]>([])
    const isFromHomePage = history.location.state?.isFromHomePage ?? false

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
        let tokensOrder: RequestEditAccountTokensOrder[] = []

        tokens.forEach((token, index) => {
            tokensOrder.push({
                tokenAddress: token.token.address,
                order: index + 1,
            })
        })

        editAccountTokensOrder(tokensOrder)
    }

    useEffect(() => {
        console.log(availableTokens)
        setTokens(availableTokens)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Assets order"
                    onBack={() =>
                        history.push(isFromHomePage ? "/" : "/settings")
                    }
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <DndProvider backend={HTML5Backend}>
                    <div className="flex flex-col space-y-2">
                        <div className="flex flex-col space-y-2">
                            {tokens.map((tokenWithBalance) => (
                                <TokenDisplayDragDrop
                                    data={tokenWithBalance.token}
                                    hoverable={true}
                                    findTokenCard={findTokenCard}
                                    moveTokenCard={moveTokenCard}
                                    onSuccessfulDrop={onSuccessfulDrop}
                                    key={tokenWithBalance.token.address}
                                />
                            ))}
                        </div>
                    </div>
                </DndProvider>
            </div>
        </PopupLayout>
    )
}

export default TokensPage
