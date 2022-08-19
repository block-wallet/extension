import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useEffect } from "react"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

interface AfterAddTokenState {
    fromToken?: Token
    toToken?: Token
    token: Token
    tokenTarget: "from" | "to"
    amount?: string
}

//This route only handles the add token callback for the swap feature.
//After collecting the state, it redirects to the /swap route.
const SwapAfterAddTokenPage = () => {
    const history = useOnMountHistory()
    const state = history.location.state
    const {
        fromToken,
        toToken,
        //recently added token
        token,
        tokenTarget,
        amount,
    } = state as AfterAddTokenState
    useEffect(() => {
        history.replace({
            pathname: "/swap",
            state: {
                fromToken:
                    tokenTarget === "from" ? token || fromToken : fromToken,
                toToken: tokenTarget === "to" ? token || toToken : toToken,
                amount,
            },
        })
    }, [amount, fromToken, history, toToken, token, tokenTarget])

    return null
}

export default SwapAfterAddTokenPage
