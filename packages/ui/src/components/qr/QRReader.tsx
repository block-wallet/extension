import { useRef } from "react"
import { QrReader } from "react-qr-reader"

interface Props {
    deviceNotReady: boolean
    className?: string
    onRead: (qr: string) => Promise<void>
}

const QrContainer = (props: Props) => {
    const lastResult = useRef()

    const onReadResult = (result: any) => {
        if (!result) return

        // This callback will keep existing even after
        // this component is unmounted
        // So ignore it (only in this reference) if result keeps repeating
        if (lastResult.current === result.text) {
            return
        }

        lastResult.current = result.text
        props.onRead(result.text)
    }
    return (
        <>
            {!props.deviceNotReady && (
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
            )}
        </>
    )
}

export default QrContainer
