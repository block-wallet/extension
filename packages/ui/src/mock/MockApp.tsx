import React from "react"
import { FunctionComponent, useEffect } from "react"
import { useHistory } from "react-router-dom"
import MockBackgroundState from "./MockBackgroundState"
import PopupRouter from "../router/PopupRouter"
import { BackgroundStateType } from "../context/background/backgroundContext"
import TabRouter from "../router/TabRouter"

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
}> = ({ location, state, assignBlankState }) => {
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
                <PopupRouter>
                    <HistoryInjector />
                </PopupRouter>
            </MockBackgroundState>
        </div>
    )
}
export { MockTab, MockPopup }
