import { QrReader } from "react-qr-reader"

interface Props {
    deviceNotReady: boolean
    className?: string
    onRead: (qr: string) => Promise<void>
}

const QrContainer = (props: Props) => {
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
                            className={props.className}
                        />
                    </div>
                </>
            )}
        </>
    )
}

export default QrContainer
