import { FunctionComponent, useEffect, useState } from "react"
import { formatHash, formatName } from "../../util/formatAccount"
import CollapsableWarning from "../CollapsableWarning"
import CheckmarkCircle from "../icons/CheckmarkCircle"
import ExclamationCircleIconFull from "../icons/ExclamationCircleIconFull"
import { getAddressType } from "../../context/commActions"

export enum AddressType {
    NORMAL = "NORMAL",
    SMART_CONTRACT = "SMART_CONTRACT",
    ERC20 = "ERC20",
    NULL = "NULL",
}

const NATIVE_ADDRESS_MESSAGE =
    "This address is not owned by any user, is often associated with token burn & mint/genesis events and used as a generic null address. Please, make sure the information is correct otherwise your assets will be permanently lost."

const CONTRACT_ADDRESS_MESSAGE =
    "This address is a smart contract address. Please, make sure the information is correct otherwise your assets will be permanently lost."

const ERC20_CONTRACT_ADDRESS_MESSAGE =
    "This address is an ERC20 smart contract address. Please, make sure the information is correct otherwise your assets will be permanently lost."

const getWarningTitle = (addressType: AddressType) => {
    switch (addressType) {
        case AddressType.NULL:
            return "Null Address"
        case AddressType.SMART_CONTRACT:
            return "Smart Contract"
        case AddressType.ERC20:
            return "ERC20 Contract"
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
    const [showingTheWholeAddress, setShowingTheWholeAddress] = useState(false)
    const [addressType, setAddressType] = useState<AddressType>()

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
        })
    }, [receivingAddress])

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
                <CollapsableWarning
                    dialog={{
                        title: "Warning",
                        message: <span>{getModalMessage(addressType)}</span>,
                    }}
                    isCollapsedByDefault
                    collapsedMessage={
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
                    }
                />
            )}
        </>
    )
}
