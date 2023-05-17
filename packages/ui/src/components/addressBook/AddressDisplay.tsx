import { FunctionComponent, useEffect, useState } from "react"
import { formatHash, formatName } from "../../util/formatAccount"
import CheckmarkCircle from "../icons/CheckmarkCircle"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import { getAddressType, setUserSettings } from "../../context/commActions"
import { useUserSettings } from "../../context/hooks/useUserSettings"
import CheckBoxDialog from "../dialog/CheckboxDialog"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

export enum AddressType {
    NORMAL = "NORMAL",
    SMART_CONTRACT = "SMART_CONTRACT",
    ERC20 = "ERC20",
    NULL = "NULL",
}

const NATIVE_ADDRESS_MESSAGE = (
    <>
        This address is not owned by any user, is often associated with token
        burn & mint/genesis events and used as a generic null address. Please,
        make sure the information is correct otherwise your assets will be
        permanently lost.
        <br />
        <br />
        Continue at your own risk.
    </>
)

const CONTRACT_ADDRESS_MESSAGE = (
    <>
        You are about to send to a smart contract address which could result in
        the loss of your funds.
        <br />
        <br />
        Continue at your own risk.
    </>
)

const ERC20_CONTRACT_ADDRESS_MESSAGE = (
    <>
        You are about to send to an ERC20 smart contract address which could
        result in the loss of your funds.
        <br />
        <br />
        Continue at your own risk.
    </>
)

const getWarningTitle = (addressType: AddressType) => {
    switch (addressType) {
        case AddressType.NULL:
            return "Null Address"
        case AddressType.SMART_CONTRACT:
            return "Smart Contract"
        case AddressType.ERC20:
            return "ERC20 Contract Address"
        default:
            return ""
    }
}

const getModalTitle = (addressType: AddressType) => {
    switch (addressType) {
        case AddressType.NULL:
            return "Null address detected"
        case AddressType.SMART_CONTRACT:
            return "Smart Contract address detected"
        case AddressType.ERC20:
            return "ERC-20 address detected"
        default:
            return ""
    }
}

const getModalMessage = (addressType: AddressType) => {
    switch (addressType) {
        case AddressType.NULL:
            return NATIVE_ADDRESS_MESSAGE
        case AddressType.SMART_CONTRACT:
            return CONTRACT_ADDRESS_MESSAGE
        case AddressType.ERC20:
            return ERC20_CONTRACT_ADDRESS_MESSAGE
        default:
            return ""
    }
}

export const AddressDisplay: FunctionComponent<{
    receivingAddress: string
    selectedAccountName: string | undefined
}> = ({ receivingAddress, selectedAccountName }) => {
    const settings = useUserSettings()
    const history = useOnMountHistory()
    const { hideSendToContractWarning, hideSendToNullWarning } =
        useUserSettings()

    const [showingTheWholeAddress, setShowingTheWholeAddress] = useState(false)
    const [addressType, setAddressType] = useState<AddressType>()

    const [openWarningPopup, setOpenWarningPopup] = useState(false)

    const addressToDisplay = formatHash(receivingAddress)
    const fullAddressToDisplay = formatHash(
        receivingAddress,
        receivingAddress.length
    )
    let accountNameToDisplay = selectedAccountName
        ? formatName(selectedAccountName, 20)
        : addressToDisplay

    const displayAddressSpan = accountNameToDisplay !== addressToDisplay

    useEffect(() => {
        getAddressType(receivingAddress).then((type) => {
            setAddressType(type)
            setOpenWarningPopup(
                (type &&
                    [AddressType.SMART_CONTRACT, AddressType.ERC20].includes(
                        type
                    ) &&
                    !hideSendToContractWarning) ||
                    (type === AddressType.NULL && !hideSendToNullWarning)
            )
        })
    }, [receivingAddress, hideSendToContractWarning, hideSendToNullWarning])

    return (
        <>
            {!addressType || addressType === AddressType.NORMAL ? (
                <div
                    className="flex flex-row items-center w-full px-6 py-3"
                    style={{ maxWidth: "100vw" }}
                    title={formatHash(
                        receivingAddress,
                        receivingAddress.length
                    )}
                    onClick={() =>
                        setShowingTheWholeAddress(!showingTheWholeAddress)
                    }
                >
                    <CheckmarkCircle classes="w-4 h-4" />
                    <span
                        className={
                            displayAddressSpan
                                ? "font-semibold text-green-500 ml-1 truncate"
                                : "font-semibold text-green-500 ml-1 truncate cursor-pointer"
                        }
                        title={receivingAddress}
                    >
                        {showingTheWholeAddress &&
                        !(accountNameToDisplay !== addressToDisplay)
                            ? fullAddressToDisplay
                            : accountNameToDisplay}
                    </span>

                    {displayAddressSpan && (
                        <span className="text-gray truncate ml-1">
                            {addressToDisplay}
                        </span>
                    )}
                </div>
            ) : (
                <>
                    <div
                        onClick={() => setOpenWarningPopup(true)}
                        className="cursor-pointer"
                    >
                        <div className="flex flex-row items-center w-full px-6 py-3">
                            <ExclamationCircleIconFull
                                className="w-4 h-4"
                                size="16"
                            />
                            <span
                                className="font-semibold ml-1 truncate text-yellow-500"
                                title={receivingAddress}
                            >
                                {getWarningTitle(addressType)}
                            </span>
                            <span className="text-gray truncate ml-1">
                                {addressToDisplay}
                            </span>
                        </div>
                    </div>
                    <CheckBoxDialog
                        open={openWarningPopup}
                        title={getModalTitle(addressType)}
                        message={getModalMessage(addressType)}
                        confirmText="Continue"
                        showCheckbox
                        showXButton={false}
                        checkboxText="Don't show this warning again"
                        onClose={() => {}}
                        onCancel={() => {
                            if (history && history.length > 1) {
                                return history.goBack()
                            } else {
                                return history.push("/")
                            }
                        }}
                        onConfirm={(saveChoice) => {
                            if (saveChoice) {
                                const isAddressTypeNull =
                                    addressType === AddressType.NULL
                                setUserSettings({
                                    ...settings,
                                    hideSendToContractWarning:
                                        !isAddressTypeNull,
                                    hideSendToNullWarning: isAddressTypeNull,
                                })
                            }
                            setOpenWarningPopup(false)
                        }}
                    />
                </>
            )}
        </>
    )
}
