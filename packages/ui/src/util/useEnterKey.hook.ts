import { useEffect } from "react"

export const useEnterKey = (submitCallback: Function) => {
    useEffect(() => {
        const listener = (event: any) => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                event.preventDefault()
                submitCallback()
            }
        }
        document.addEventListener("keydown", listener)
        return () => {
            document.removeEventListener("keydown", listener)
        }
    }, [])
}
