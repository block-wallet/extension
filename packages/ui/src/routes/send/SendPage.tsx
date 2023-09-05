import { useState, useEffect, useRef } from "react"
import { useMergeRefs } from "../../context/hooks/useMergeRefs"
import { addressBookSet } from "../../context/commActions"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"

import classnames from "classnames"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"

import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { useAddressBookAccounts } from "../../context/hooks/useAddressBookAccounts"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"

import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import AccountSearchResults, {
    AccountResult,
} from "../../components/account/AccountSearchResults"
import Checkbox from "../../components/input/Checkbox"
import { isValidAddress, toChecksumAddress } from "ethereumjs-util"
import { formatHashLastChars } from "../../util/formatAccount"

// Schema
const schema = yup.object().shape({
    address: yup
        .string()
        .required("No address provided.")
        .test("is-correct", "Address is incorrect", (address) => {
            return isValidAddress(`${address}`)
        }),
})
type AddressFormData = { address: string }

const SendPage = () => {
    const history = useOnMountHistory()

    const defaultAsset = history.location.state?.asset
    const fromAssetPage = defaultAsset ?? false
    const currentAccount = useSelectedAccount()

    const myAccounts = useSortedAccounts({
        filterCurrentAccount: true,
    })

    const addressBookAccounts = useAddressBookAccounts()

    // State
    const [selectedAccount, setSelectedAccount] = useState<AccountResult>()
    const [searchString, setSearchString] = useState<string>("")
    const [warning, setWarning] = useState<string>("")
    const [preSelectedAsset, setPreSelectedAsset] = useState<TokenWithBalance>()
    const [isAddress, setIsAddress] = useState<boolean>(false)

    const [addContact, setAddContact] = useState(false)
    const [canAddContact, setCanAddContact] = useState(false)

    const searchInputRef = useRef<HTMLInputElement>(null)
    const [showSearchSkeleton, setShowSearchSkeleton] = useState<boolean>(false)

    const {
        register,
        handleSubmit,
        setValue,

        formState: { errors },
    } = useForm<AddressFormData>({
        resolver: yupResolver(schema),
    })

    // Hooks
    useEffect(() => {
        defaultAsset && setPreSelectedAsset(defaultAsset)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handlers
    const onSubmit = handleSubmit(async (data: AddressFormData) => {
        if (addContact) {
            await addressBookSet(
                data.address,
                `Account ${formatHashLastChars(data.address)}`,
                ""
            )
        }
        history.push({
            pathname: "/send/confirm",
            state: {
                address: toChecksumAddress(data.address),
                asset: preSelectedAsset,
                name: selectedAccount?.name,
                fromAssetPage: fromAssetPage,
            },
        })
    })
    const { ref } = register("address")

    const onChangeHandler = async (event: any) => {
        // Bind
        const value = event.target.value
        setValue("address", value)
        setSearchString(value)
        setAddContact(false)
    }

    useEffect(() => {
        const checkAddress = () => {
            const validAddress = isValidAddress(searchString)

            setIsAddress(validAddress)
            setCanAddContact(false)
            setWarning("")

            if (validAddress) {
                const normalizedAddress = toChecksumAddress(searchString)

                const isCurrentAccount =
                    normalizedAddress === currentAccount.address

                if (isCurrentAccount) {
                    setWarning(
                        "Warning: You are trying to send to your own address."
                    )
                }

                const isInAddressBook = (addressBookAccounts || []).some(
                    ({ address }) => address === normalizedAddress
                )

                const isInMyAccounts = (myAccounts || []).some(
                    ({ address }) => address === normalizedAddress
                )

                setCanAddContact(
                    !isCurrentAccount && !isInAddressBook && !isInMyAccounts
                )
            }
        }

        checkAddress()
    }, [addressBookAccounts, currentAccount.address, myAccounts, searchString])

    const onAccountSelect = (account: any) => {
        setSelectedAccount(account)
        setValue("address", account.address, {
            shouldValidate: true,
        })
        setSearchString(account.address)
        setIsAddress(true)
    }

    const goToSide = () => {
        if (!searchInputRef.current) return

        const len = searchInputRef.current.value.length
        searchInputRef.current.setSelectionRange(len, len)
    }

    // Component
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Send"
                    networkIndicator
                    onBack={() => {
                        history.push(
                            fromAssetPage
                                ? {
                                      pathname: "/asset/details",
                                      state: {
                                          address: defaultAsset.token.address,
                                          transitionDirection: "right",
                                      },
                                  }
                                : { pathname: "/home" }
                        )
                    }}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Next"
                        disabled={!isAddress}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
            showProviderStatus
        >
            {/* Search or Input */}
            <div className="flex flex-col space-y-2 w-full bg-white z-[9]">
                <div className="w-full p-6 pb-0 space-y-2">
                    <SearchInput
                        placeholder="Enter public address, name or select contact"
                        name="address"
                        ref={useMergeRefs(ref, searchInputRef)}
                        error={errors.address?.message}
                        warning={warning}
                        autoFocus={true}
                        isValid={isAddress}
                        onChange={onChangeHandler}
                        onPaste={() => {
                            setTimeout(() => {
                                if (!searchInputRef.current) return

                                searchInputRef.current.blur()
                                searchInputRef.current.focus()

                                goToSide()
                            }, 300)
                        }}
                        debounced
                        debounceTime={1000}
                        searchShowSkeleton={setShowSearchSkeleton}
                    />
                    {canAddContact && !showSearchSkeleton && (
                        <Checkbox
                            label="Add to contacts"
                            checked={addContact}
                            onChange={() => setAddContact(!addContact)}
                        />
                    )}
                </div>
            </div>
            <div
                className={classnames(
                    "space-y-4 pt-6 pb-6",
                    warning !== "" || (canAddContact && !showSearchSkeleton)
                        ? "mt-5"
                        : "mt-1"
                )}
            >
                <AccountSearchResults
                    filter={searchString}
                    onSelect={onAccountSelect}
                    showSearchSkeleton={showSearchSkeleton}
                    setShowSearchSkeleton={setShowSearchSkeleton}
                />
            </div>
        </PopupLayout>
    )
}

export default SendPage
