import { useState } from "react"
import { QrReader } from "react-qr-reader"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const QrContainer = (props: any) => {
    const history = useOnMountHistory()
    const [data, setData] = useState("No result")
    const [scanDelay, setScanDelay] = useState(500)

    return (
        <>
            {scanDelay > 0 && (
                <>
                    <QrReader
                        scanDelay={scanDelay}
                        onResult={(result: any, error: any) => {
                            if (result) {
                                setData(result?.text)
                                setScanDelay(0)
                                history.push("/hardware-wallet/accounts")
                            }

                            if (error) {
                                console.info(error)
                            }
                        }}
                    />
                </>
            )}
        </>
    )
}

export default QrContainer
