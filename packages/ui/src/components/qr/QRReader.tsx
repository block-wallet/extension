import { useRef } from "react"
import { QrReader } from "react-qr-reader"

interface Props {
    deviceNotReady: boolean
    className?: string
    onRead: (qr: string) => Promise<boolean>
}

const QrContainer = (props: Props) => {
    const lastResult = useRef()
    const done = useRef(false)

    const onReadResult = async (result: any) => {
        if (!result) return
        if (done && done.current) return

        // This callback will keep existing even after
        // this component is unmounted
        // So ignore it (only in this reference) if result keeps repeating
        if (lastResult.current === result.text) {
            return
        }

        lastResult.current = result.text
        if (await props.onRead(result.text)) {
            done.current = true
        }
    }
    return (
        <>
            {!props.deviceNotReady ? (
                <>
                    <div style={{ filter: "blur(5px)" }}>
                        <QrReader
                            constraints={{ facingMode: "environment" }}
                            scanDelay={250}
                            onResult={onReadResult}
                            className={props.className}
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