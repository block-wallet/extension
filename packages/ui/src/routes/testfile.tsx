import TransactionQR from "../components/qr/TransactionQR"
import { useOnMountHistory } from "../context/hooks/useOnMount"

const testfileQR = () => {
    const history = useOnMountHistory()
    return (
        <TransactionQR
            QRValue={
                "ur:eth-sign-request/oladtpdagdloialbgeeecngwidlawkwptpstlblskkaohddyaowyahlalrahykvyaelrwntkkbsolfgmaymwmhrloekbzcwmkplyrhsoaopkgymnisaafratwdfpltaxlgkboxswlaaelartaxaaaaahahtaaddyoeadlecsdwykcsfnykaeykaewkaewkaocywtbereglamghmtkslpjksrhkwefmdrptlyjovaflwddtbtahdahfvdeofgoe"
            }
            onBack={
                () => {
                    history.push("/home")
                }
                //     useCallback(
                //     () => dispatch({ type: "close" }),
                //     [dispatch]
                // )
            }
            onQRSignatureProvided={() => {
                history.push("/home")
            }}
        />
    )
}

export default testfileQR
