import { DependencyList, useEffect, useState } from "react"

export const useAsync = <T>(f: () => Promise<T>, deps?: DependencyList) => {
    const [value, setValue] = useState<T>()
    const [error, setError] = useState<Error>()
    useEffect(() => {
        const refresh = async () => {
            try {
                setValue(await f())
                setError(undefined)
            } catch (e: any) {
                setValue(undefined)
                setError(e)
            }
        }
        refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
    return [value, error] as [T | undefined, Error | undefined]
}
