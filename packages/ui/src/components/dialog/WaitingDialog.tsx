import { useReducer, ReactNode } from "react"

// Components
import LoadingDialog from "./LoadingDialog"
import ErrorDialog from "./ErrorDialog"
import SuccessDialog from "./SuccessDialog"

type texts = {
    loading: React.ReactElement | string
    success: React.ReactElement | string
    error: React.ReactElement | string
}
type gifs = { loading: ReactNode | undefined }
export type status = "idle" | "loading" | "success" | "error"
export type loadingDialogProps = {
    open: boolean
    status: status
    titles: texts
    texts: texts
    gifs?: gifs
    onDone: () => void
    timeout?: number // Success only: If setted, it will trigger onDone() after timeout value.
    txHash?: string // Success only: If valid hash, shows explorer link i.e. View on Etherscan
    hideButton?: boolean
    clickOutsideToClose?: boolean
    showCloseButton?: boolean
}

type state = {
    isOpen: boolean
    status: status
    texts?: Partial<texts>
    titles?: Partial<texts>
    gifs?: gifs
}

type action =
    | {
          type: "open" | "setStatus"
          payload: {
              status: status
              texts?: Partial<texts>
              titles?: Partial<texts>
              gifs?: gifs
              forceOpen?: boolean
          }
      }
    | {
          type: "close"
      }

const reducer = (state: state, action: action) => {
    switch (action.type) {
        case "open":
            return {
                status: action.payload.status,
                isOpen: true,
                texts: action.payload.texts,
                titles: action.payload.titles,
                gifs: action.payload.gifs,
            }
        case "close":
            return {
                ...state,
                isOpen: false,
                texts: undefined,
                titles: undefined,
                gifs: undefined,
            }
        case "setStatus":
            return {
                ...state,
                status: action.payload.status,
                texts: action.payload.texts,
                titles: action.payload.titles,
                gifs: action.payload.gifs,
                isOpen: action.payload.forceOpen ? true : state.isOpen,
            }
    }
}

export const useWaitingDialog = (
    {
        defaultStatus = "loading",
        defaultIsOpen = false,
    }: {
        defaultStatus?: status
        defaultIsOpen?: boolean
    } = {
        defaultStatus: "loading",
        defaultIsOpen: false,
    }
) => {
    const [state, dispatch] = useReducer(reducer, {
        isOpen: defaultIsOpen,
        status: defaultStatus,
        texts: undefined,
        titles: undefined,
        gifs: undefined,
    })

    return {
        ...state,
        dispatch,
    }
}

/**
 * ### Why?
 * WaitingDialog is way to easily implements this kind of flow:
 * ```
 * Loading -> Success | Error
 * ```
 * The component is based on a status that can take one of these value: `loading | success | error`
 * Depending on the status it'll show a different modal.
 *
 * ### How to use it?
 * To avoid repeating this kind of code:
 * ```
 * const [isOpen, setIsOpen] = useState(false)
 * const [status, setStatus] = useState('loading')
 * ```
 * You can use the hook that comes with the component:
 * ```
 * const { isOpen, status, dispatch } = useWaitingDialog()
 * ```
 *
 * If you want to update `isOpen` or `status`, you can do like so:
 * ```
 * // Set isOpen = false
 * dispatch({ type: "close" })
 *
 * // Set isOpen = true & status = 'loading | success | error'
 * dispatch({ type: "open", payload: { status: 'loading | success | error' }})
 *
 * // Set status = 'loading | success | error'
 * dispatch({ type: "status", payload: { status: 'loading | success | error' }})
 * ```
 */
const WaitingDialog = ({
    open,
    status,
    titles,
    texts,
    gifs,
    txHash,
    timeout,
    onDone,
    hideButton,
    clickOutsideToClose,
    showCloseButton = false,
}: loadingDialogProps) => {
    if (!open) return <></>

    switch (status) {
        case "loading":
            return (
                <LoadingDialog
                    open={status === "loading"}
                    title={titles.loading}
                    message={texts.loading}
                    customSpinner={gifs?.loading}
                />
            )
        case "success":
            return (
                <SuccessDialog
                    open={status === "success"}
                    title={titles.success}
                    message={texts.success}
                    timeout={timeout}
                    txHash={txHash}
                    onDone={onDone}
                    onClickOutside={
                        clickOutsideToClose === false ? () => {} : onDone
                    }
                    hideButton={hideButton}
                    showCloseButton={showCloseButton}
                />
            )
        case "error":
            return (
                <ErrorDialog
                    open={status === "error"}
                    title={titles.error}
                    message={texts.error}
                    onDone={onDone}
                    timeout={timeout}
                    onClickOutside={
                        clickOutsideToClose === false ? () => {} : onDone
                    }
                    hideButton={hideButton}
                    showCloseButton={showCloseButton}
                />
            )
        case "idle":
            return null
    }
}

export default WaitingDialog
