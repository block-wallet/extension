import { FC, useRef, useState } from "react"
import { QrReader } from "react-qr-reader"
import { Result } from "@zxing/library"
import { requestMediaAccess } from "../../context/util/requestMediaAccess"
import classnames from "classnames"
import no_camera from "../../assets/images/icons/no_camera.svg"

interface Props {
    deviceNotReady?: boolean
    className?: string
    onRead: (qr: string) => Promise<boolean>
}

const QrContainer: FC<Props> = ({
    deviceNotReady = false,
    className,
    onRead,
}) => {
    const lastResult = useRef<string>()
    const done = useRef(false)
    const [isCameraReady, setIsCameraReady] = useState(true)

    requestMediaAccess().then((result) => {
        setIsCameraReady(result)
    })

    const onReadResult = async (result: Result | undefined | null) => {
        const resultText = result?.getText()
        if (!result || !resultText) return
        if (done && done.current) return

        // This callback will keep existing even after
        // this component is unmounted
        // So ignore it (only in this reference) if result keeps repeating
        if (lastResult.current === resultText) {
            return
        }

        lastResult.current = resultText
        if (await onRead(resultText)) {
            done.current = true
        }
    }

    return (
        <>
            {!deviceNotReady && isCameraReady ? (
                <>
                    <div style={{ filter: "blur(5px)" }}>
                        <QrReader
                            constraints={{ facingMode: "environment" }}
                            scanDelay={250}
                            onResult={onReadResult}
                            className={className}
                        />
                    </div>
                </>
            ) : !isCameraReady && !deviceNotReady ? (
                <>
                    <div className="mt-6 mb-2">
                        <img
                            src={no_camera}
                            alt="icon"
                            className="w-14 block ml-auto mr-auto"
                        />
                    </div>
                    <div className="mb-6">
                        <div
                            className={classnames(
                                "break-words ml-3 text-lg text-center"
                            )}
                        >
                            We can't find your camera, make sure it's connected
                            and installed properly.
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
