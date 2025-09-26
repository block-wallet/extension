import { useState, useEffect, useRef, useCallback } from "react"
import { useMergeRefs } from "../../context/hooks/useMergeRefs"
import { addressBookSet, addressBookGetRecentAddresses } from "../../context/commActions"
import { resolveEnsName } from "../../context/commActions"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useBlankState } from "../../context/background/backgroundHooks"
import { setUserSettings } from "../../context/commActions"

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
import AccountsList from "../../components/account/AccountsList"
import AccountDisplay from "../../components/account/AccountDisplay"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"

type RecentAddressInfo = {
    address: string;
    name: string;
}

const normalizeAddress = (address: string): string => {
    return address.toLowerCase();
}

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

    const [selectedAccount, setSelectedAccount] = useState<AccountResult>()
    const [searchString, setSearchString] = useState<string>("")
    const [warning, setWarning] = useState<string>("")
    const [ensResolvedAddress, setEnsResolvedAddress] = useState<string | null>(null)
    const [originalEnsName, setOriginalEnsName] = useState<string | null>(null)
    const { settings } = useBlankState()!
    const ensHintsEnabled = settings?.ensHintsEnabled ?? true
    const [preSelectedAsset, setPreSelectedAsset] = useState<TokenWithBalance>()
    const [isAddress, setIsAddress] = useState<boolean>(false)

    const [addContact, setAddContact] = useState(false)
    const [canAddContact, setCanAddContact] = useState(false)

    const searchInputRef = useRef<HTMLInputElement>(null)
    const [showSearchSkeleton, setShowSearchSkeleton] = useState<boolean>(false)
    const [recentAddresses, setRecentAddresses] = useState<RecentAddressInfo[]>([])
    const [showRecents, setShowRecents] = useState<boolean>(true)

    const {
        register,
        handleSubmit,
        setValue,

        formState: { errors },
    } = useForm<AddressFormData>({
        resolver: yupResolver(schema),
    })

    useEffect(() => {
        defaultAsset && setPreSelectedAsset(defaultAsset)
    }, [])

    useEffect(() => {
        const fetchRecents = async () => {
            try {
                const recents = await addressBookGetRecentAddresses(5)
                const formattedRecents: RecentAddressInfo[] = Object.entries(recents).map(([address, entry]) => {
                    const matchingAccount = [currentAccount, ...myAccounts].find(
                        (acc) => normalizeAddress(acc.address) === normalizeAddress(address)
                    )

                    return {
                        address: address,
                        name:
                            matchingAccount?.name || entry.name || `Account ${formatHashLastChars(address)}`,
                    }
                })
                setRecentAddresses(formattedRecents)
            } catch (error) {
                console.error("Error fetching recent addresses:", error)
            }
        }
        fetchRecents()
    }, [myAccounts, currentAccount])

    const onSubmit = handleSubmit(async (data: AddressFormData) => {
        const checksummedAddress = toChecksumAddress(data.address);
        if (addContact) {
            const contactName = originalEnsName
                ? originalEnsName
                : `Account ${formatHashLastChars(checksummedAddress)}`;

            await addressBookSet(
                checksummedAddress,
                contactName,
                ""
            )
        }
        history.push({
            pathname: "/send/confirm",
            state: {
                address: checksummedAddress,
                asset: preSelectedAsset,
                name: selectedAccount?.name,
                fromAssetPage: fromAssetPage,
            },
        })
    })
    const { ref } = register("address")

    const { ens } = useSelectedNetwork()

    const onChangeHandler = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setValue("address", value)
        setSearchString(value)
        setAddContact(false)
        setShowRecents(value === "")
        try {
            if (ensHintsEnabled && ens && /\.[eE][tT][hH]$/.test(value.trim())) {
                const addr = await resolveEnsName(value.trim())
                setEnsResolvedAddress(addr)
                setOriginalEnsName(value.trim())
            } else {
                setEnsResolvedAddress(null)
                setOriginalEnsName(null)
            }
        } catch {
            setEnsResolvedAddress(null)
            setOriginalEnsName(null)
        }
    }, [setValue, setSearchString, setAddContact, setShowRecents, ens, ensHintsEnabled])

    useEffect(() => {
        const checkAddress = () => {
            const validAddress = isValidAddress(searchString)

            setIsAddress(validAddress)
            setCanAddContact(false)
            setWarning("")

            if (validAddress) {
                const checksummedAddress = toChecksumAddress(searchString)
                const normalizedAddress = normalizeAddress(checksummedAddress)

                const isCurrentAccount =
                    normalizedAddress === normalizeAddress(currentAccount.address)

                if (isCurrentAccount) {
                    setWarning(
                        "Warning: You are trying to send to your own address."
                    )
                }

                const isInAddressBook = (addressBookAccounts || []).some(
                    ({ address }) => normalizeAddress(address) === normalizedAddress
                )

                const isInMyAccounts = (myAccounts || []).some(
                    ({ address }) => normalizeAddress(address) === normalizedAddress
                )

                setCanAddContact(
                    !isCurrentAccount && !isInAddressBook && !isInMyAccounts
                )
            }
        }

        checkAddress()
    }, [addressBookAccounts, currentAccount.address, myAccounts, searchString])

    const onAccountSelect = useCallback((account: AccountInfo | AccountResult | RecentAddressInfo) => {
        if (account && account.address) {
            const checksummedAddress = toChecksumAddress(account.address);

            setSelectedAccount({ address: checksummedAddress, name: account.name });
            setValue("address", checksummedAddress, {
                shouldValidate: true,
            })
            setSearchString(checksummedAddress)
            setIsAddress(true)
            setShowRecents(false)
            setOriginalEnsName(null)
        }
    }, [setValue, setSelectedAccount, setSearchString, setIsAddress, setShowRecents])

    const goToSide = () => {
        if (!searchInputRef.current) return

        const len = searchInputRef.current.value.length
        searchInputRef.current.setSelectionRange(len, len)
    }

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
            <div className="flex flex-col space-y-2 w-full bg-white dark:bg-gray-900 z-[9] flex-shrink-0">
                <div className="w-full p-6 pb-2 space-y-2">
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
                    {ensHintsEnabled && ensResolvedAddress && !isAddress && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 px-1 max-w-full">
                            <div className="flex flex-col gap-2 max-w-full">
                                <div className="flex items-center justify-between">
                                    <span>Resolves to:</span>
                                    <button
                                        type="button"
                                        className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 text-xs"
                                        onClick={() => {
                                            const addr = ensResolvedAddress
                                            if (!addr) return
                                            setValue("address", addr, { shouldValidate: true })
                                            setSearchString(addr)
                                            setIsAddress(true)
                                            setShowRecents(false)
                                            setEnsResolvedAddress(null)
                                        }}
                                    >
                                        Use
                                    </button>
                                </div>
                                <div className="font-mono text-xs break-all text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                    {ensResolvedAddress}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="px-1 space-y-2">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="cursor-pointer w-4 h-4 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400"
                                checked={!!ensHintsEnabled}
                                onChange={async (e) => {
                                    await setUserSettings({
                                        ...settings,
                                        ensHintsEnabled: e.target.checked,
                                    })
                                }}
                            />
                            Show ENS hints
                        </label>
                        {canAddContact && !showSearchSkeleton && (
                            <div className="-mt-2">
                                <Checkbox
                                    label="Add to contacts"
                                    checked={addContact}
                                    onChange={() => setAddContact(!addContact)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div
                className={classnames(
                    "flex-1 overflow-auto space-y-4 pt-4 pb-4",
                    warning !== ""
                        ? "mt-3"
                        : "mt-1"
                )}
            >
                {showRecents && recentAddresses.length > 0 ? (
                    <div className="flex flex-col px-6">
                        <AccountsList title="RECENT ADDRESSES">
                            {recentAddresses.map((account) => (
                                <AccountDisplay
                                    key={account.address}
                                    account={account as any}
                                    selected={false}
                                    showAddress={true}
                                    onClickAccount={() => onAccountSelect(account)}
                                />
                            ))}
                        </AccountsList>
                    </div>
                ) : (
                    <AccountSearchResults
                        filter={searchString}
                        onSelect={onAccountSelect}
                        showSearchSkeleton={showSearchSkeleton}
                        setShowSearchSkeleton={setShowSearchSkeleton}
                    />
                )}
            </div>
        </PopupLayout>
    )
}

export default SendPage
