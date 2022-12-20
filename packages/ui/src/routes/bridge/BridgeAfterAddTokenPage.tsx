import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useEffect } from "react"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

interface AfterAddTokenState {
    token: Token
    amount?: string
}

//This route only handles the add token callback for the bridge feature.
//After collecting the state, it redirects to the /bridge route.
const BridgeAfterAddTokenPage = () => {
    const history = useOnMountHistory()
    const state = history.location.state
    const { token, amount } = state as AfterAddTokenState
    useEffect(() => {
        history.replace({
            pathname: "/bridge",
            state: {
                token,
                amount,
            },
        })
    }, [amount, history, token])

    return null
}

export default BridgeAfterAddTokenPage
