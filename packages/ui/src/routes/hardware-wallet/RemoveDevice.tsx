import React, { useState } from "react"
import classnames from "classnames"

import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { AccountType, Devices } from "../../context/commTypes"
import Divider from "../../components/Divider"

// Assets & icons
import ledger from "../../assets/images/icons/ledger.svg"
import trezor from "../../assets/images/icons/trezor.svg"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles"

import HardwareWalletSetupLayout from "./SetupLayout"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { removeHardwareWallet } from "../../context/commActions"

const HardwareWalletRemoveDevicePage = () => {
    const history = useOnMountHistory()
    const accounts = useSortedAccounts({ includeHiddenAccounts: true })
    const [selectedVendor, setSelectedVendor] = useState<Devices>()
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const next = async () => {
        if (!selectedVendor) {
            return
        }
        try {
            setIsLoading(true)

            const result = await removeHardwareWallet(selectedVendor)

            if (result) {
                history.push({
                    pathname: "/hardware-wallet/remove-device/success",
                    state: { vendor: selectedVendor },
                })
            }
        } catch (e: any) {
        } finally {
            setIsLoading(false)
        }
    }

    const isDeviceImported = (device: Devices): number => {
        const accountType =
            device === Devices.LEDGER ? AccountType.LEDGER : AccountType.TREZOR
        return accounts.filter(
            (account: AccountInfo) => account.accountType === accountType
        ).length
    }

    return (
        <HardwareWalletSetupLayout
            title="Remove device"
            subtitle="Select a Hardware Wallet you'd like to remove from BlockWallet. All the accounts imported from the selected device will be removed."
            buttons={
                <ButtonWithLoading
                    label={"Remove device and accounts"}
                    buttonClass={classnames(Classes.button, "h-14")}
                    onClick={next}
                    disabled={!selectedVendor}
                    isLoading={isLoading}
                />
            }
        >
            <div className="flex flex-col">
                <div className="flex flex-row space-x-4 items-center justify-evenly p-8">
                    <button
                        type="button"
                        onClick={() =>
                            isDeviceImported(Devices.LEDGER) &&
                            setSelectedVendor(Devices.LEDGER)
                        }
                        className={classnames(
                            "bg-white rounded-md p-4 w-1/2 flex flex-col items-center justify-center space-y-3 cursor-pointer border hover:border-primary-300",
                            selectedVendor === Devices.LEDGER
                                ? "border-primary-300"
                                : "border-primary-100",
                            !isDeviceImported(Devices.LEDGER) &&
                                "opacity-50 pointer-events-none"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img
                            src={ledger}
                            alt="Connect Ledger"
                            className="h-8"
                        />
                        {isDeviceImported(Devices.LEDGER)} Accounts
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            isDeviceImported(Devices.TREZOR) &&
                            setSelectedVendor(Devices.TREZOR)
                        }
                        className={classnames(
                            "bg-white rounded-md justify-center p-4 w-1/2 flex flex-col items-center group space-y-3 cursor-pointer border hover:border-primary-300",
                            selectedVendor === Devices.TREZOR
                                ? "border-primary-300"
                                : "border-primary-100",
                            !isDeviceImported(Devices.TREZOR) &&
                                "opacity-50 pointer-events-none"
                        )}
                        style={{ height: "120px" }}
                    >
                        <img
                            src={trezor}
                            alt="Connect Trezor"
                            className="h-8"
                        />
                        {isDeviceImported(Devices.TREZOR)} Accounts
                    </button>
                </div>
                <Divider />
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletRemoveDevicePage
