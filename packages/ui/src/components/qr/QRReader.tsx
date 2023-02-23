import { FC, useRef } from "react"
import { QrReader } from "react-qr-reader"
import { Result } from "@zxing/library"

interface Props {
    deviceNotReady: boolean
    className?: string
    onRead: (qr: string) => Promise<boolean>
}

const QrContainer: FC<Props> = ({ deviceNotReady, className, onRead }) => {
    const lastResult = useRef<string>()
    const done = useRef(false)

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
            {!deviceNotReady ? (
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
            ) : (
                <div className="w-64 h-64"></div>
            )}
        </>
    )
}

export default QrContainer
