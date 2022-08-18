import { useCallback, useReducer, useRef } from "react"
import { mergeReducer } from "../reducerUtils"

export enum Status {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    ERROR = "error",
}

interface AsyncState<T> {
    status?: Status
    data?: T
    error?: Error | null
}

const defaultInitialState = {
    status: Status.IDLE,
    data: undefined,
    error: null,
}

//

/**
 * This hook aims to encapsulate async information such us the status,
 * response data and invocation error.
 *
 * @param initialState
 *
 * Example usage:
 * ```
 * const {data, error, status, run} = useAsyncInvoke()
 * const executeSave = (newData) => {
 *  run(saveData(newData))
 * }
 * ```
 */
function useAsyncInvoke<T>(initialState: AsyncState<T> = {}) {
    const initialStateRef = useRef<AsyncState<T>>({
        ...defaultInitialState,
        ...initialState,
    })
    const [{ status, data, error }, setState] = useReducer(
        mergeReducer<AsyncState<T>, any>(),
        initialStateRef.current
    )

    const setData = useCallback(
        (data: any) => setState({ data, status: Status.SUCCESS }),
        [setState]
    )
    const setError = useCallback(
        (error: any) => setState({ error, status: Status.ERROR }),
        [setState]
    )
    const reset = useCallback(() => setState(initialStateRef.current), [
        setState,
    ])

    const run = useCallback(
        (promise: Promise<any>) => {
            if (!promise || !promise.then) {
                throw new Error(
                    `The argument passed to useAsyncInvoke().run must be a promise.`
                )
            }
            setState({ status: Status.PENDING })
            return promise.then(
                (data: any) => {
                    setData(data)
                    return data
                },
                (error: Error) => {
                    setError(error)
                    return Promise.reject(error)
                }
            )
        },
        [setState, setData, setError]
    )

    return {
        isIdle: status === Status.IDLE,
        isLoading: status === Status.PENDING,
        isError: status === Status.ERROR,
        isSuccess: status === Status.SUCCESS,

        setData,
        setError,
        error,
        status,
        data,
        run,
        reset,
    }
}

export default useAsyncInvoke
