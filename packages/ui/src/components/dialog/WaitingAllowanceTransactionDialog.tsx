import { FC, useCallback } from "react"
import { useHistory } from "react-router-dom"
import { boolean } from "yup"
import ClickableText from "../button/ClickableText"
import Divider from "../Divider"
import WaitingDialog from "./WaitingDialog"

type Operation = "swap" | "bridge"

interface Props {
    operation: Operation
    isOpen: boolean
    status: "idle" | "loading" | "success" | "error"
    onError: () => void
    onSuccess: () => void
}

const WaitingAllowanceTransactionDialog: FC<Props> = ({
    isOpen,
    status,
    operation,
    onError,
    onSuccess,
}) => {
    const history = useHistory()
    return (
        <WaitingDialog
            open={isOpen}
            status={status}
            titles={{
                loading: "Waiting for allowance transaction...",
                success: "Success",
                error: "Allowance approval failed",
            }}
            texts={{
                loading: <WaitingMessage operation={operation} />,
                success: `The approval transaction has been mined. You can proceeed with the ${operation} now.`,
                error: "Please try again. If the problem persists, please contact support.",
            }}
            clickOutsideToClose={false}
            //Less timeout for success message.
            timeout={status === "success" ? 2000 : 3000}
            onDone={useCallback(() => {
                if (status === "error") {
                    onError ? onError() : history.push("/")
                    return
                }
                if (status === "success") {
                    onSuccess()
                }
            }, [status, history])}
        />
    )
}

const WaitingMessage = ({ operation }: { operation: Operation }) => {
    const history = useHistory()
    return (
        <div className="flex flex-col space-y-2 items-center">
            <span>{`Your ${operation} is being prepared, please wait.`}</span>
            <Divider />
            <span className="text-xs">
                {"You can wait here until it is done or "}
                <ClickableText onClick={() => history.push("/")}>
                    {`${operation} later`}
                </ClickableText>
                {" when the token approval is completed."}
            </span>
        </div>
    )
}

export default WaitingAllowanceTransactionDialog
