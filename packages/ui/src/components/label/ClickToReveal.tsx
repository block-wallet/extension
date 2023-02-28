import { FunctionComponent } from "react"
import lockIcon from "../../assets/images/icons/lock.svg"

const ClickToReveal: FunctionComponent<{
    hiddenText: string
    revealMessage: string
    revealed: boolean
    onClick: () => void
}> = ({ hiddenText, revealMessage, revealed, onClick }) => (
    <div className="relative p-8 overflow-hidden text-gray-900 rounded-md bg-primary-grey-default">
        {!revealed ? (
            <button
                type="button"
                onClick={onClick}
                className="absolute top-0 left-0 z-10 flex flex-col items-center justify-center w-full h-full space-y-2 bg-opacity-25 bg-primary-200"
            >
                <img src={lockIcon} alt="lock" className="w-5 h-5" />
                <span className="font-bold">{revealMessage}</span>
            </button>
        ) : null}
        <span
            className="font-bold break-words allow-select"
            style={revealed ? {} : { filter: "blur(0.15rem)" }}
        >
            {hiddenText}
        </span>
    </div>
)

export default ClickToReveal
