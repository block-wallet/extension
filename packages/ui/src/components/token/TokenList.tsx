import { FC } from "react"
import TokenDisplay from "../token/TokenDisplay"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"

const TokenList: FC<{
    setActive?: () => void
    onTokenClick: (token: Token, setActive?: () => void) => void
    selectedSymbol?: string
    tokens: Token[]
    searchValue: string | null
}> = ({ onTokenClick, setActive, selectedSymbol, tokens, searchValue }) => {
    return (
        <div className="pb-6">
            <input
                readOnly
                name="token"
                className="hidden"
                value={selectedSymbol}
            />
            {tokens.map((token) => {
                return (
                    <div
                        className="cursor-pointer"
                        key={token.address}
                        onClick={() => onTokenClick(token, setActive)}
                    >
                        <TokenDisplay
                            data={{
                                ...token,
                            }}
                            clickable={false}
                            active={selectedSymbol === token.symbol}
                            hoverable={true}
                        />
                    </div>
                )
            })}
            {searchValue && tokens.length === 0 && (
                <div className="px-3">
                    <p className="text-xs text-primary-black-default text-center p-4">
                        The token couldn&#8217;t be found.
                    </p>
                </div>
            )}
        </div>
    )
}

export default TokenList
