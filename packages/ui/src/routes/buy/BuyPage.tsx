import classnames from "classnames"
import AccountDisplay from "../../components/account/AccountDisplay"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import CurrencySelection from "../../components/currency/CurrencySelection"
import { useEffect, useState } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import onramper from "../../assets/images/icons/onramper.svg"
import {
    ONRAMPER_API_KEY,
    getOnRamperCurrenciesByNetwork,
} from "../../util/onRamperUtils"
import { TokenSelection } from "../../components/token/TokenSelection"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

const BuyPage = () => {
    const history = useOnMountHistory()
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>()
    const [selectedToken, setSelectedToken] = useState<Token>()
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const network = useSelectedNetwork()
    const currenctAccountInfo = useSelectedAccount()
    const networkName =
        network.name.toLowerCase() === "mainnet"
            ? "ethereum"
            : network.name.toLowerCase()

    const [currencyList, setCurrencyList] = useState<Currency[]>([])
    const [tokenList, setTokenList] = useState<Token[]>([])

    useEffect(() => {
        const getOnramperCurrencies = async () => {
            const response = await getOnRamperCurrenciesByNetwork(networkName)
            setTokenList(response.crypto)
            setCurrencyList(response.fiat)
        }

        getOnramperCurrencies()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onContinue = async () => {
        const defaultCrypto = selectedToken
            ? selectedToken.symbol + "_" + networkName
            : ""
        const walletAddress = defaultCrypto + ":" + currenctAccountInfo.address

        const onRamperURL = new URL("https://buy.onramper.com")
        onRamperURL.searchParams.append("apiKey", ONRAMPER_API_KEY)
        onRamperURL.searchParams.append(
            "defaultFiat",
            selectedCurrency ? selectedCurrency.code : ""
        )
        onRamperURL.searchParams.append("defaultCrypto", defaultCrypto)
        onRamperURL.searchParams.append("wallets", walletAddress)
        onRamperURL.searchParams.append("isAddressEditable", "false")

        window.open(onRamperURL)

        //Check where to redirect
        history.push("/")
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    networkIndicator
                    title="Buy"
                    onBack={() => {
                        history.push("/home")
                    }}
                    close="/"
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Continue"
                        disabled={
                            !(
                                acceptedTerms &&
                                selectedToken !== undefined &&
                                selectedCurrency !== undefined
                            )
                        }
                        onClick={onContinue}
                    />
                </PopupFooter>
            }
            submitOnEnter={{ onSubmit: onContinue }}
        >
            <div className="flex flex-col p-6 h-full w-full">
                <div className={classnames("flex flex-row")}>
                    <div className="flex flex-col space w-1/2 pr-1.5">
                        <p className="mb-2 text-sm font-medium text-primary-grey-dark">
                            Spend
                        </p>
                        <CurrencySelection
                            onCurrencyChange={(currency) => {
                                setSelectedCurrency(currency)
                            }}
                            topMargin={100}
                            bottomMargin={60}
                            dropdownWidth="w-[309px]"
                            selectedCurrency={selectedCurrency}
                            defaultCurrencyList={currencyList}
                        />
                    </div>
                    <div className="flex flex-col w-1/2 pl-1.5">
                        <p className="mb-2 text-sm font-medium text-primary-grey-dark">
                            Receive
                        </p>
                        <TokenSelection
                            onTokenChange={(token) => {
                                setSelectedToken(token)
                            }}
                            topMargin={100}
                            bottomMargin={60}
                            dropdownWidth="w-[309px]"
                            selectedToken={selectedToken}
                            popUpOpenLeft={true}
                            defaultTokenList={tokenList}
                        />
                    </div>
                </div>
                <div className="pt-6">
                    <hr className="-mx-5" />
                </div>
                <div className="mt-6">
                    <span className="font-medium text-sm text-primary-grey-dark">
                        Will arrive to:
                    </span>
                    <AccountDisplay
                        account={currenctAccountInfo}
                        className="bg-primary-grey-default hover hover:bg-primary-grey-hover h-20 mt-1.5 cursor-default"
                    />
                </div>
                <div className="mt-6 flex flex-row items-center">
                    <input
                        type="checkbox"
                        checked={acceptedTerms}
                        className={
                            "cursor-pointer w-4 h-4 border-1 border-primary-grey-hover rounded-md focus:ring-0"
                        }
                        onChange={() => {
                            setAcceptedTerms(!acceptedTerms)
                        }}
                        id="checkbox"
                    />
                    <label
                        htmlFor="checkbox"
                        className=" cursor-pointer text-xs pl-2"
                    >
                        You agree to be redirected to Onramper for your fiat
                        payment. KYC may be required by the selected provider.
                        BlockWallet does not access or hold your KYC data at any
                        moment. Have questions?{" "}
                        <a
                            href=""
                            target="_blank"
                            className="text-primary-blue-default hover:underline"
                        >
                            Learn More
                        </a>
                    </label>
                </div>
                <div className="flex self-center mt-5">
                    Powered by{" "}
                    <img
                        src={onramper}
                        className="ml-1.5"
                        alt="Power by Onramper"
                    />
                </div>
            </div>
        </PopupLayout>
    )
}

export default BuyPage
