import React, { useState } from "react"
import classnames from "classnames"

import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { Devices } from "../../context/commTypes"
import Divider from "../../components/Divider"

// Assets & icons
import ledger from "../../assets/images/icons/ledger.svg"
import trezor from "../../assets/images/icons/trezor.svg"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles"

import HardwareWalletSetupLayout from "./SetupLayout"

const HardwareWalletVendorsPage = () => {
    const history = useOnMountHistory()
    const [selectedVendor, setSelectedVendor] = useState<Devices>()
    const next = () => {
        history.push({
            pathname: "/hardware-wallet/connect",
            state: { vendor: selectedVendor },
        })
    }
    return (
        <HardwareWalletSetupLayout
            title="Connect Hardware Wallet"
            subtitle="Select a Hardware Wallet you'd like to use with BlockWallet."
            buttons={
                <ButtonWithLoading
                    label={"Continue"}
                    buttonClass={classnames(Classes.button, "h-14")}
                    onClick={next}
                    disabled={!selectedVendor}
                />
            }
        >
            <div className="flex flex-col">
                <div className="flex flex-row space-x-4 items-center justify-evenly p-8">
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.LEDGER)}
                        className={classnames(
                            "bg-white rounded-md p-4 w-1/2 flex flex-col items-center justify-center space-y-3 cursor-pointer border hover:border-primary-300",
                            selectedVendor === Devices.LEDGER
                                ? "border-primary-300"
                                : "border-primary-100"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img
                            src={ledger}
                            alt="Connect Ledger"
                            className="h-8"
                        />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedVendor(Devices.TREZOR)}
                        className={classnames(
                            "bg-white rounded-md justify-center p-4 w-1/2 flex flex-col items-center group space-y-3 cursor-pointer border  hover:border-primary-300",
                            selectedVendor === Devices.TREZOR
                                ? "border-primary-300"
                                : "border-primary-100"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img
                            src={trezor}
                            alt="Connect Trezor"
                            className="h-8"
                        />
                    </button>
                </div>
                <Divider />
                <div className="w-full flex flex-col p-8 space-y-5">
                    <ExternalLink
                        href="https://help.blockwallet.io/hc/en-us/articles/6670564432657-How-do-Hardware-Wallets-Work-"
                        title="How do Hardware Wallets work?"
                    />
                    <ExternalLink
                        href="https://help.blockwallet.io/hc/en-us/articles/6670519949585-How-to-get-the-Ledger-Hardware-Wallet"
                        title="How to get a Ledger?"
                    />
                    <ExternalLink
                        href="https://help.blockwallet.io/hc/en-us/articles/6670542248209-How-to-get-the-Trezor-Hardware-Wallet-"
                        title="How to get a Trezor?"
                    />
                </div>
            </div>
        </HardwareWalletSetupLayout>
    )
}

const ExternalLink = ({ href, title }: { href: string; title: string }) => (
    <div className="flex justify-between w-full text-base font-medium hover:text-primary-300 cursor-pointer">
        <a href={href} target="_blank" rel="noreferrer">
            {title}
        </a>
        <span>{">"}</span>
    </div>
)

export default HardwareWalletVendorsPage
