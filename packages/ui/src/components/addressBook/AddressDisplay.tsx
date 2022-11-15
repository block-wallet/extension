import { FunctionComponent, useState } from "react"
import { formatHash, formatName } from "../../util/formatAccount"
import { isNativeTokenAddress } from "../../util/tokenUtils"
import CheckmarkCircle from "../icons/CheckmarkCircle"

const NATIVE_ADDRESS_MESSAGE =
    "This address is not owned by any user, is often associated with token burn & mint/genesis events and used as a generic null address. Please, make sure the information is correct otherwise your assets will be permanently lost."

export const AddressDisplay: FunctionComponent<{
    receivingAddress: string
    selectedAccountName: string | undefined
}> = ({ receivingAddress, selectedAccountName }) => {
    const [showingTheWholeAddress, setShowingTheWholeAddress] = useState(false)
    const isNativeToken = isNativeTokenAddress(receivingAddress)

    let titleMessage = receivingAddress
    if (isNativeToken) {
        titleMessage = NATIVE_ADDRESS_MESSAGE
    }

    const addressToDisplay = formatHash(receivingAddress)
    const fullAddressToDisplay = formatHash(
        receivingAddress,
        receivingAddress.length
    )
    let accountNameToDisplay = selectedAccountName
        ? formatName(selectedAccountName, 20)
        : addressToDisplay

    const displayAddressSpan =
        accountNameToDisplay !== addressToDisplay || isNativeToken

    return (
        <>
            <div
                className="flex flex-row items-center w-full px-6 py-3"
                style={{ maxWidth: "100vw" }}
                title={formatHash(receivingAddress, receivingAddress.length)}
                onClick={() =>
                    setShowingTheWholeAddress(!showingTheWholeAddress)
                }
            >
                <CheckmarkCircle classes="w-4 h-4" />
                <span
                    className={
                        displayAddressSpan
                            ? "font-bold text-green-500 ml-1 truncate"
                            : "font-bold text-green-500 ml-1 truncate cursor-pointer"
                    }
                    title={titleMessage}
                >
                    {isNativeToken
                        ? "Null Address"
                        : showingTheWholeAddress &&
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
        </>
    )
}
