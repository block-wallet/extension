import { FunctionComponent } from "react"
import { classnames } from "../../styles"
import Tooltip from "../label/Tooltip"

const SIZES = {
    sm: 110,
    normal: 175,
}

const TRANSLATE = {
    sm: "",
    normal: "",
}

const AntiPhishing: FunctionComponent<{
    image: string | undefined
    size?: "sm" | "normal"
}> = ({ image = "", size = "normal" }) => {
    if (!image) return <></>

    const imgSize = SIZES[size] ?? SIZES["normal"]
    const translateTooltip = TRANSLATE[size] ?? TRANSLATE["normal"]
    return (
        <div className="flex flex-col items-center">
            <div className="flex flex-col space-y-2 items-end justify-end select-none">
                <div className={classnames("group relative")}>
                    <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://blockwallet.io/docs/what-is-phishing-protection"
                        className="block transition-transform duration-200 hover:scale-105"
                    >
                        <img
                            src={image}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-blue-default dark:hover:border-primary-blue-400 shadow-sm hover:shadow-md transition-all duration-200"
                            alt="Anti-phishing protection"
                            width={imgSize}
                            height={imgSize}
                        />
                    </a>
                    <Tooltip
                        placement="top"
                        align="center"
                        autoFlip
                        className={translateTooltip}
                        content={
                            <div className="flex flex-col items-start text-xs font-semibold p-1">
                                <div className="flex flex-row items-end space-x-7">
                                    <span>Phishing Protection</span>{" "}
                                </div>
                                <div className="flex flex-row items-end space-x-4">
                                    <span>Click to learn more.</span>{" "}
                                </div>
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    )
}

export default AntiPhishing
