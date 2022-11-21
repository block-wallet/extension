import React, { Dispatch, useEffect, useRef, useState } from "react"

export interface SubscriptionContext<T> {
    state: T
    isLoading: boolean
}

type SubscribeCallback<T> = (cb: (state: T) => void) => Promise<boolean>

interface SubscribeOptions {
    name?: string
    initLoading?: boolean
}

const defaultOptions = {
    name: "",
    initLoading: false,
}

function useStateSubscription<T>(
    stateGetter: () => Promise<T> | T,
    subscriber: SubscribeCallback<T> | undefined,
    initialState: T,
    { name, initLoading }: SubscribeOptions = defaultOptions
) {
    const initialized = useRef<boolean>(false)
    const [state, setState] = useState<T>(initialState)
    const [isLoading, setIsLoading] = useState<boolean>(initLoading ?? false)
    useEffect(() => {
        const log =
            (callback: Dispatch<React.SetStateAction<T>>) => (newState: T) => {
                if (process.env.LOG_LEVEL === "debug") {
                    console.log(`Updating Store: ${name}`, newState)
                }
                callback(newState)
            }

        async function generateSubscription() {
            initialized.current = true
            setIsLoading(true)
            const initialState = await stateGetter()
            setIsLoading(false)
            setState(initialState)
            if (subscriber) {
                subscriber(log(setState))
            }
        }
        if (!initialized.current) {
            generateSubscription()
        }
    }, [])
    return { state, isLoading }
}

export default useStateSubscription
