import { FunctionComponent } from "react"
import { classnames } from "../../styles"
import Tooltip from "../label/Tooltip"

const SIZES = {
    sm: 110,
    normal: 175,
}

const TRANSLATE = {
    sm: "!-translate-y-20 !translate-x-1/4",
    normal: "!-translate-y-40 !translate-x-3/4",
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
                    >
                        <img
                            src={image}
                            className="rounded-lg border border-primary-200 hover:border-primary-blue-default"
                            alt="anti-phishing"
                            width={imgSize}
                            height={imgSize}
                        />
                    </a>
                    <Tooltip
                        className={translateTooltip}
                        content={
                            <div className="flex flex-col items-start text-xs text-white-500 font-semibold p-1">
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
