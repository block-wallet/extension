import { FC } from "react"
import { act, render, screen } from "@testing-library/react"
import LocalStorageMock from "../../mock/LocalStorageMock"
import useLocalStorageState from "../hooks/useLocalStorageState"
import {
    generateVolatileLocalStorageKey,
    retrieveLocalStorageItem,
} from "../localSotrage"
import { Route, Router } from "react-router-dom"
import { createMemoryHistory } from "history"
import MockWindowIdProvider from "../../mock/MockWindowIdProvider"

const KEY = "testStorageKey"

const LocalStorageTest: FC<any> = (opt: any) => {
    const [count, setCount] = useLocalStorageState(KEY, {
        initialValue: 0,
        ...opt,
    })
    return (
        <div>
            <label id="count">Count:</label>
            <span aria-labelledby="count">{count}</span>
            <button
                onClick={() => act(() => setCount((prev: number) => prev + 1))}
            >
                Increment
            </button>
            <button
                onClick={() => act(() => setCount((prev: number) => prev - 1))}
            >
                Decrement
            </button>
            <button onClick={() => act(() => setCount(null))}>Remove</button>
        </div>
    )
}

const renderLocalStorageTest = (props: any = {}) => {
    return render(
        <MockWindowIdProvider>
            <Router history={props.history || createMemoryHistory()}>
                <Route exact path="/">
                    <LocalStorageTest {...props} />
                </Route>
            </Router>
        </MockWindowIdProvider>
    )
}

describe("useLocalStorage test", () => {
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
    test("Should initialize the localStorage", () => {
        renderLocalStorageTest({ volatile: false, initialValue: 3 })
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(3)
        expect(screen.getByLabelText(/count/i).textContent).toEqual("3")
    })
    test("Should store in the localStorage the count value", async () => {
        renderLocalStorageTest({ volatile: false })

        screen.getByRole("button", { name: /increment/i }).click()
        expect(screen.getByLabelText(/count/i).textContent).toEqual("1")
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(1)

        screen.getByRole("button", { name: /increment/i }).click()
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(2)

        expect(screen.getByLabelText(/count/i).textContent).toEqual("2")
        screen.getByRole("button", { name: /decrement/i }).click()
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(1)

        expect(screen.getByLabelText(/count/i).textContent).toEqual("1")
        screen.getByRole("button", { name: /remove/i }).click()
        expect(retrieveLocalStorageItem(KEY)).toBeNull()
    })
    test("Should clean after history.push", async () => {
        const history = createMemoryHistory()
        renderLocalStorageTest({
            volatile: true,
            initialValue: 3,
            history,
        })
        expect(
            retrieveLocalStorageItem(generateVolatileLocalStorageKey(KEY))
        ).toStrictEqual(3)
        act(() => history.push("/mockroute"))
        expect(retrieveLocalStorageItem(KEY)).toBeNull()
    })
    test("Should not clean after history.push", async () => {
        const history = createMemoryHistory()
        renderLocalStorageTest({
            volatile: false,
            initialValue: 3,
            history,
        })
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(3)
        act(() => history.push("/mockroute"))
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(3)
    })
    test("Should initialize a volatile localStorage", () => {
        renderLocalStorageTest({ volatile: false, initialValue: 3 })
        expect(retrieveLocalStorageItem(KEY)).toStrictEqual(3)
        expect(screen.getByLabelText(/count/i).textContent).toEqual("3")
    })
})
