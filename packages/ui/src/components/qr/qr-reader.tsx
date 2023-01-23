import { useState } from "react"
import { QrReader } from "react-qr-reader"

const QrContainer = (props: any) => {
    const [scanDelay, setScanDelay] = useState(500)

    return (
        <>
            {scanDelay > 0 && (
                <>
                    {/* TODO (KEYSTONE): This component generates some warnings */}
                    <QrReader
                        // TODO (KEYSTONE): Complete 'constraints' prop
                        constraints={{ facingMode: "environment" }}
                        scanDelay={scanDelay}
                        onResult={(result: any, error: any) => {
                            if (!!result) {
                                setScanDelay(0)
                                props.onRead(result?.text)
                            }
                        }}
                    />
                </>
            )}
        </>
    )
}

export default QrContainer
