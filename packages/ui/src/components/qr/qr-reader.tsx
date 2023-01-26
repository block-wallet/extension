import { QrReader } from "react-qr-reader"

const QrContainer = (props: any) => {
    return (
        <>
            {!props.deviceNotReady && (
                <>
                    <QrReader
                        constraints={{ facingMode: "environment" }}
                        scanDelay={250}
                        onResult={(result: any) => {
                            if (!!result) {
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
