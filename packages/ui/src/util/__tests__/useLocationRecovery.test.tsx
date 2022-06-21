/* eslint-disable testing-library/render-result-naming-convention */
import React, { FC } from "react"
import { act, render } from "@testing-library/react"
import { Route, Router } from "react-router-dom"
import {
    useLocationRecovery,
    useLocationRecoveryListener,
} from "../../util/hooks/useLocationRecovery"
import LocalStorageMock from "../../mock/LocalStorageMock"
import { createMemoryHistory } from "history"
import MockWindowIdProvider from "../../mock/MockWindowIdProvider"

const Listener: FC<any> = ({ blockList }) => {
    useLocationRecoveryListener(blockList || [])
    return null
}

const Component = () => {
    return <div />
}

const renderLocationRecoveryTest = (props: any = {}) => {
    return render(
        <MockWindowIdProvider>
            <Router history={props.history}>
                <Route
                    path="/"
                    component={() => <Listener blockList={props.blockList} />}
                />
                <Route exact path="/home" component={Component} />
                <Route exact path="/form" component={Component} />
            </Router>
        </MockWindowIdProvider>
    )
}

const renderTestComponent = (windowId?: string) => {
    let result: any
    function TestComponent() {
        result = useLocationRecovery()
        return null
    }
    render(
        <MockWindowIdProvider windowId={windowId}>
            <TestComponent />
        </MockWindowIdProvider>
    )
    return result
}

describe("useLocationRecovery tests", () => {
    let windowLocalStorage: any
    beforeAll(() => {
        windowLocalStorage = window.localStorage
    })
    beforeEach(() => {
        Object.defineProperty(window, "localStorage", {
            value: LocalStorageMock,
        })
        window.localStorage.clear()
    })
    afterAll(() => {
        Object.defineProperty(window, "localStorage", {
            value: windowLocalStorage,
        })
    })
    test("Should recover the last visited location", () => {
        const history = createMemoryHistory()
        renderLocationRecoveryTest({
            history,
            blockList: [],
        })

        act(() => history.push("/form"))

        let hookData = renderTestComponent()

        expect(hookData!.lastLocation).toBeDefined()
        expect(hookData!.lastLocation.pathname).toStrictEqual("/form")
    })
    test("Should clear the lastLocation if the last visited route is blocklisted", () => {
        const history = createMemoryHistory()
        renderLocationRecoveryTest({
            history,
            blockList: ["/form"],
        })

        act(() => history.push("/form"))

        let hookData = renderTestComponent()

        expect(hookData!.lastLocation).toBeUndefined()
    })
    test("Should store the last visited location if the route is not blocklisted", () => {
        const history = createMemoryHistory()
        renderLocationRecoveryTest({
            history,
            blockList: ["/form"],
        })

        act(() => history.push("/home"))

        let hookData = renderTestComponent()

        expect(hookData!.lastLocation).toBeDefined()
        expect(hookData!.lastLocation.pathname).toStrictEqual("/home")
    })
    test("Should store the last visited location along with its sate", () => {
        const history = createMemoryHistory()
        renderLocationRecoveryTest({
            history,
        })

        act(() => history.push("/form", { inputValue: "12345" }))

        let hookData = renderTestComponent()

        expect(hookData!.lastLocation).toBeDefined()
        expect(hookData!.lastLocation.pathname).toStrictEqual("/form")
        expect(hookData!.lastLocation.state).toStrictEqual({
            inputValue: "12345",
        })
    })
})
