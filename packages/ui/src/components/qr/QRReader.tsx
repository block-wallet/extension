import { FC, useRef, useState } from "react"
import { requestMediaAccess } from "../../context/util/requestMediaAccess"
import classnames from "classnames"
import no_camera from "../../assets/images/icons/no_camera.svg"
import { AnimatedQRScanner, URType } from "@keystonehq/animated-qr"

export interface URParameter {
    type: string
    cbor: string
}

interface Props {
    deviceNotReady?: boolean
    onRead: (ur: URParameter) => Promise<boolean>
    options?: {
        width?: number | string
        height?: number | string
        blur?: boolean
    }
    urTypes: URType[]
}

const QrContainer: FC<Props> = ({
    deviceNotReady = false,
    options,
    onRead,
    urTypes,
}) => {
    const lastResult = useRef<string>()
    const done = useRef(false)
    const [isCameraReady, setIsCameraReady] = useState(true)

    requestMediaAccess().then((result) => {
        setIsCameraReady(result)
    })

    const handleResult = async (ur: URParameter) => {
        const resultText = ur?.cbor
        if (!ur || !resultText) return
        if (done && done.current) return

        // This callback will keep existing even after
        // this component is unmounted
        // So ignore it (only in this reference) if result keeps repeating
        if (lastResult.current === resultText) {
            return
        }

        lastResult.current = resultText
        if (await onRead(ur)) {
            done.current = true
        }
    }
    const handleError = (error: string) => {
        console.log("Error")
        console.log(error)
    }

    return (
        <>
            {!deviceNotReady && isCameraReady ? (
                <>
                    <div style={{ filter: "blur(5px)" }}>
                        <AnimatedQRScanner
                            handleScan={handleResult}
                            handleError={handleError}
                            urTypes={urTypes}
                            options={options}
                        />
                    </div>
                </>
            ) : !isCameraReady && !deviceNotReady ? (
                <>
                    <div className="flex items-center w-64 h-64 ml-auto mr-auto">
                        <div className="border border-primary-100 mt-6 mb-6 rounded-md">
                            <div className="mb-4 mt-4">
                                <img
                                    src={no_camera}
                                    alt="icon"
                                    className="w-10 block ml-auto mr-auto"
                                />
                            </div>
                            <div
                                className={classnames(
                                    "break-words ml-3 text-sm text-center mb-6"
                                )}
                            >
                                We can't find your camera, make sure it's
                                connected and installed properly.
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-64 h-64"></div>
            )}
        </>
    )
}

export default QrContainer
