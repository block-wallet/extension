import { FunctionComponent, useEffect } from "react"
import { useHistory } from "react-router-dom"
import MockBackgroundState from "./MockBackgroundState"
import PopupRouter from "../router/PopupRouter"
import { BackgroundStateType } from "../context/background/backgroundContext"
import TabRouter from "../router/TabRouter"
import MockGasPricesState from "./MockGasPricesState"
import MockActivityListState from "./MockActivityListState"
import MockExchangeRatesState from "./MockExchangeRatesState"
import {
    ResponseGetActivityListState,
    ResponseGetExchangeRatesState,
    ResponseGetGasPricesState,
} from "@block-wallet/background/utils/types/communication"

const MockTab: FunctionComponent<{
    location: string
    state?: any // location state
    assignBlankState?: Partial<BackgroundStateType["blankState"]>
}> = ({ location, state, assignBlankState }) => {
    const HistoryInjector = () => {
        const history = useHistory()
        useEffect(() => {
            history.replace({ pathname: location, state })
        }, [history])
        return null
    }
    return (
        <div className="relative w-full h-full overflow-hidden border border-gray-500 rounded-md">
            <MockBackgroundState assignBlankState={assignBlankState}>
                <TabRouter>
                    <HistoryInjector />
                </TabRouter>
            </MockBackgroundState>
        </div>
    )
}

const MockPopup: FunctionComponent<{
    location: string
    state?: any // location state
    assignBlankState?: Partial<BackgroundStateType["blankState"]>
    assignGasPricesState?: Partial<ResponseGetGasPricesState>
    assignActivityListState?: Partial<ResponseGetActivityListState>
    assignExchangeRatesState?: Partial<ResponseGetExchangeRatesState>
}> = ({
    location,
    state,
    assignBlankState,
    assignGasPricesState,
    assignActivityListState,
    assignExchangeRatesState,
}) => {
    const HistoryInjector = () => {
        const history = useHistory()
        useEffect(() => {
            history.replace({ pathname: location, state })
        }, [history])
        return null
    }
    return (
        <div
            className="relative overflow-y-scroll overflow-x-hidden border border-gray-500 rounded-md storybook-content"
            style={{ width: 357, height: 600 }}
        >
            <MockBackgroundState assignBlankState={assignBlankState}>
                <MockGasPricesState
                    assignGasPricesState={assignGasPricesState || {}}
                >
                    <MockActivityListState
                        assignActivityListState={assignActivityListState || {}}
                    >
                        <MockExchangeRatesState
                            assignExchangeRatesState={
                                assignExchangeRatesState || {}
                            }
                        >
                            <PopupRouter>
                                <HistoryInjector />
                            </PopupRouter>
                        </MockExchangeRatesState>
                    </MockActivityListState>
                </MockGasPricesState>
            </MockBackgroundState>
        </div>
    )
}
export { MockTab, MockPopup }
