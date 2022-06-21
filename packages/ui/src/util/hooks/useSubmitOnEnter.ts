import log from "loglevel"
import { useEffect, useRef } from "react"
import useAsyncInvoke from "./useAsyncInvoke"

export interface submitOnEnterProps {
    onSubmit?: () => Promise<any>,
    isFormValid?: boolean,
    isEnabled?: boolean
}

/**
 * Hook to submit the form when the user presses enter key.
 * It handles the case where the form is invalid both from the user and from the background, allowing to submit again in case it fail.
 * @param onSubmit function to trigger.
 * @param isFormValid flag that indicates if the form is valid, this applies when the form implements Yup client-side validations.
 * @param isEnabled flag that indicates if submit button is enabled according to page logic.
 */
const useSubmitOnEnter = ({ onSubmit, isFormValid, isEnabled }: submitOnEnterProps = { onSubmit: undefined, isEnabled: true, isFormValid: true }) => {
    const canSubmit = useRef(isEnabled)
    const { run, isError } = useAsyncInvoke()

    useEffect(() => {

        // Callback function
        const cb = (e: KeyboardEvent) => {
            if (!onSubmit || e.key !== "Enter") return

            e.preventDefault()

            if (!canSubmit.current) return

            canSubmit.current = false

            run(onSubmit().catch(err => log.error(err)))
        }

        // Event listener
        window.addEventListener("keypress", cb)

        // Cleanup
        return () => window.removeEventListener("keypress", cb)

        // Only on first render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // This effect handles the case where the form is invalid "client side" after submitting, then the user corrects
    // the values so we allow submitting again. useForm hook validations are triggered onSubmit and if the form was invalid
    // the next time will be triggered onChange so we check if the form is valid and change the flag accordingly.
    useEffect(() => {
        if (isFormValid && !canSubmit.current) {
            canSubmit.current = true
        }

    }, [isFormValid])


    // This effect handles the case where the form is invalid in background and the promise is rejected, so we allow submitting again.
    useEffect(() => {
        if (isError && !canSubmit.current) {
            canSubmit.current = true
        }
    }, [isError])


    // Handle submit button being enabled according to page logic
    useEffect(() => {
        canSubmit.current = isEnabled
    }, [isEnabled])
}

export default useSubmitOnEnter
