import { FunctionComponent } from "react"
import lockIcon from "../../assets/images/icons/lock.svg"

function formatSeedPhrase(seedPhrase: string) {
    const words = seedPhrase.split(" ")
    const result = words.map((word, index) => {
        if (index % 4 === 3) {
            return (
                <>
                    {word}
                    <br />
                </>
            )
        }
        return word + " "
    })
    return result
}

const ClickToReveal: FunctionComponent<{
    hiddenText: string
    revealMessage: string
    revealed: boolean
    onClick: () => void
}> = ({ hiddenText, revealMessage, revealed, onClick }) => {
    const formattedSeedPhrase = formatSeedPhrase(hiddenText)
    return (
        <div className="relative p-8 overflow-hidden text-gray-900 rounded-md bg-primary-grey-default text-center">
            {!revealed ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="absolute top-0 left-0 z-10 flex flex-col items-center justify-center w-full h-full space-y-2 bg-opacity-25 bg-primary-grey-hover"
                >
                    <img src={lockIcon} alt="lock" className="w-5 h-5" />
                    <span className="font-semibold">{revealMessage}</span>
                </button>
            ) : null}
            <span
                className="font-semibold break-words allow-select"
                style={revealed ? {} : { filter: "blur(0.15rem)" }}
            >
                {formattedSeedPhrase}
            </span>
        </div>
    )
}

export default ClickToReveal
