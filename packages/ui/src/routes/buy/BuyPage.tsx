import classnames from "classnames"
import AccountDisplay from "../../components/account/AccountDisplay"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useEffect, useState } from "react"
import { Currency } from "@block-wallet/background/utils/currency"
import onramper from "../../assets/images/icons/onramper.svg"
import { TokenSelection } from "../../components/token/TokenSelection"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { CurrencySelection } from "../../components/currency/CurrencySelection"
import { useBlankState } from "../../context/background/backgroundHooks"
import { getOnrampCurrencies } from "../../context/commActions"
import { ONRAMPER_API_KEY } from "../../util/onrampUtils"

const BuyPage = () => {
    const history = useOnMountHistory()
    const [selectedToken, setSelectedToken] = useState<Token>()
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const currenctAccountInfo = useSelectedAccount()
    const { nativeCurrency, networkNativeCurrency } = useBlankState()!
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>()
    const [currencyList, setCurrencyList] = useState<Currency[]>([])
    const [tokenList, setTokenList] = useState<Token[]>([])

    useEffect(() => {
        const setOnrampCurrencies = async () => {
            const response = await getOnrampCurrencies()
            console.log(response)
            setTokenList(response.crypto)
            setCurrencyList(response.fiat)
        }

        setOnrampCurrencies()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setSelectedCurrency(
            currencyList.find(
                (currency) =>
                    currency.code.toLowerCase() === nativeCurrency.toLowerCase()
            )
        )
        setSelectedToken(
            tokenList.find(
                (token) =>
                    token.symbol.toLowerCase() ===
                    networkNativeCurrency.symbol.toLowerCase()
            )
        )
    }, [tokenList, currencyList, nativeCurrency, networkNativeCurrency.symbol])

    const onContinue = async () => {
        const defaultCrypto = selectedToken ? selectedToken.type : ""
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
            submitOnEnter={{
                onSubmit: onContinue,
                isEnabled:
                    acceptedTerms &&
                    selectedToken !== undefined &&
                    selectedCurrency !== undefined,
            }}
        >
            <div className="flex flex-col p-6 h-full w-full">
                <div className={classnames("flex flex-row")}>
                    <div className="flex flex-col space w-1/2 pr-1.5">
                        <p className="mb-2 text-sm font-medium text-primary-grey-dark">
                            Spend
                        </p>
                        <CurrencySelection
                            onCurrencyChange={setSelectedCurrency}
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
                            href="https://help.blockwallet.io/hc/en-us/articles/14999893544337"
                            target="_blank"
                            className="text-primary-blue-default hover:underline"
                            rel="noreferrer"
                        >
                            Learn More
                        </a>
                    </label>
                </div>
                <div className="flex self-center mt-5">
                    Powered by{" "}
                    <a
                        href="https://www.onramper.com/"
                        className="text-primary-blue-default hover:underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img
                            src={onramper}
                            className="ml-1.5 mt-1"
                            alt="Power by Onramper"
                        />
                    </a>
                </div>
            </div>
        </PopupLayout>
    )
}

export default BuyPage
