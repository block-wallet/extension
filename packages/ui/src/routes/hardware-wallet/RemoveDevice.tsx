import { Dispatch, FC, SetStateAction, useState } from "react"
import classnames from "classnames"

import { useOnMountHistory } from "../../context/hooks/useOnMount"

import { Devices } from "../../context/commTypes"
import Divider from "../../components/Divider"

// Assets & icons
import ledgerImg from "../../assets/images/icons/ledger.svg"
import trezorImg from "../../assets/images/icons/trezor.svg"
import keystoneImg from "../../assets/images/keystone.png"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { Classes } from "../../styles"

import HardwareWalletSetupLayout from "./SetupLayout"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { removeHardwareWallet } from "../../context/commActions"
import { getAccountTypeFromDevice } from "../../util/hardwareDevice"
import { capitalize } from "../../util/capitalize"

type DeviceButtonProps = {
    device: Devices
    onClick: Dispatch<SetStateAction<Devices | undefined>>
    className: string
}

const DETAILS = {
    [Devices.LEDGER]: {
        imgSrc: ledgerImg,
        name: capitalize(Devices.LEDGER),
    },
    [Devices.TREZOR]: {
        imgSrc: trezorImg,
        name: capitalize(Devices.TREZOR),
    },
    [Devices.KEYSTONE]: {
        imgSrc: keystoneImg,
        name: capitalize(Devices.KEYSTONE),
    },
}

const DeviceButton: FC<DeviceButtonProps> = ({
    device,
    onClick,
    className,
}) => {
    const details = DETAILS[device]
    const accounts = useSortedAccounts({ includeHiddenAccounts: true })
    const getImportedDevices = (device: Devices): number => {
        const accountType = getAccountTypeFromDevice(device)
        return accounts.filter(
            (account: AccountInfo) => account.accountType === accountType
        ).length
    }
    const importedDevices = getImportedDevices(device)
    const isDeviceImported = importedDevices > 0
    return (
        <button
            type="button"
            onClick={() => isDeviceImported && onClick(device)}
            className={classnames(
                "bg-white rounded-md p-4 w-1/2 flex flex-col items-center justify-center space-y-3 cursor-pointer border hover:border-primary-300",
                className,
                !isDeviceImported && "opacity-50 pointer-events-none"
            )}
            style={{ height: "120px" }}
        >
            <img
                src={details.imgSrc}
                alt={`Remove ${details.name} hardware wallet`}
                className="h-8 mb-2"
            />
            {importedDevices === 1
                ? "1 Account"
                : importedDevices + " Accounts"}
        </button>
    )
}

const HardwareWalletRemoveDevicePage = () => {
    const history = useOnMountHistory()
    const [selectedVendor, setSelectedVendor] = useState<Devices>()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const isFromAccountsPage =
        history.location.state && history.location.state.isFromAccountsPage
            ? history.location.state.isFromAccountsPage
            : false

    const next = async () => {
        if (!selectedVendor) {
            return
        }
        try {
            setIsLoading(true)

            const result = await removeHardwareWallet(selectedVendor)

            if (result) {
                if (!isFromAccountsPage) {
                    history.push({
                        pathname: "/hardware-wallet/remove-device/success",
                        state: { vendor: selectedVendor },
                    })
                } else {
                    history.push({
                        pathname: "/hardware-wallet",
                    })
                }
            }
        } catch (e: any) {
        } finally {
            setIsLoading(false)
        }
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
                    <DeviceButton
                        device={Devices.LEDGER}
                        onClick={setSelectedVendor}
                        className={
                            selectedVendor === Devices.LEDGER
                                ? "border-primary-300"
                                : "border-primary-100"
                        }
                    />
                    <DeviceButton
                        device={Devices.TREZOR}
                        onClick={setSelectedVendor}
                        className={
                            selectedVendor === Devices.TREZOR
                                ? "border-primary-300"
                                : "border-primary-100"
                        }
                    />
                    <DeviceButton
                        device={Devices.KEYSTONE}
                        onClick={setSelectedVendor}
                        className={
                            selectedVendor === Devices.KEYSTONE
                                ? "border-primary-300"
                                : "border-primary-100"
                        }
                    />
                </div>
                <Divider />
            </div>
        </HardwareWalletSetupLayout>
    )
}

export default HardwareWalletRemoveDevicePage
