import { QrReader } from "react-qr-reader"

const QrContainer = (props: any) => {
    return (
        <>
            {!props.deviceNotReady && (
                <>
                    <div style={{ filter: "blur(5px)" }}>
                        <QrReader
                            constraints={{ facingMode: "environment" }}
                            scanDelay={250}
                            onResult={(result: any) => {
                                if (!!result) {
                                    props.onRead(result?.text)
                                }
                            }}
                        />
                    </div>
                </>
            )}
        </>
    )
}

export default QrContainer
