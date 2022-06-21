import React, { useState, useEffect, useRef } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"

import classnames from "classnames"

import checkmarkMiniIcon from "../../assets/images/icons/checkmark_mini.svg"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { InferType } from "yup"
import { utils } from "ethers"
import { searchEns, EnsResult } from "../../util/searchEns"

import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"

import AddressBookSelect from "../../components/addressBook/AddressBookSelect"
import AccountDisplay from "../../components/account/AccountDisplay"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import { useSortedAccounts } from "../../context/hooks/useSortedAccounts"
import { filterAccounts } from "../../util/filterAccounts"
import { searchUD, UDResult } from "../../util/searchUD"
import AccountsList from "../../components/account/AccountsList"

// Schema
const schema = yup.object().shape({
    address: yup
        .string()
        .required("No address provided.")
        .test("is-correct", "Address is incorrect", (address) => {
            return utils.isAddress(`${address}`)
        }),
})
type AddressFormData = InferType<typeof schema>

const SendPage = () => {
    const history = useOnMountHistory()

    const defaultAsset = history.location.state?.asset
    const fromAssetPage = defaultAsset ?? false
    const currentAccount = useSelectedAccount()
    const network = useSelectedNetwork()

    // Filter other wallet accounts
    const accounts = useSortedAccounts({
        filterCurrentAccount: true,
    })
    const [filteredAccounts, setFilteredAccounts] = useState<AccountInfo[]>(
        accounts
    )

    // State
    const [ensSearch, setEnsSearch] = useState<string>("")
    const [udSearch, setUDSearch] = useState<string>("")
    const [ensEnabled, setEnsEnabled] = useState<boolean>(false)
    const [ensSelected, setEnsSelected] = useState<EnsResult>()
    const [isEnsSelected, setIsEnsSelected] = useState<boolean>(false)
    const [udSelected, setUDSelected] = useState<UDResult>()
    const [isUDSelected, setIsUDSelected] = useState<boolean>(false)
    const [ensResult, setEnsResult] = useState<EnsResult>()
    const [udResult, setUDResult] = useState<UDResult>()
    const [warning, setWarning] = useState<string>("")
    const [preSelectedAsset, setPreSelectedAsset] = useState<TokenWithBalance>()
    const [isAddress, setIsAddress] = useState<boolean>(false)

    const searchInputRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        errors,
        setValue,
    } = useForm<AddressFormData>({
        resolver: yupResolver(schema),
    })

    // Hooks
    useEffect(() => {
        network.ens && setEnsEnabled(true)
        defaultAsset && setPreSelectedAsset(defaultAsset)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Functions
    const checkSameAddress = (value: string) => {
        if (value.toLowerCase() === currentAccount.address.toLowerCase()) {
            setWarning("Warning: You are trying to send to your own address.")
        } else setWarning("")
    }

    // Handlers
    const onSubmit = handleSubmit((data: AddressFormData) => {
        history.push({
            pathname: "/send/confirm",
            state: {
                address: data.address,
                asset: preSelectedAsset,
                ens: ensSelected,
                ud: udSelected,
                fromAssetPage: fromAssetPage,
            },
        })
    })

    const onChangeHandler = async (event: any) => {
        // Bind
        const value = event.target.value
        setEnsSearch(value)
        setUDSearch(value)
        setEnsResult(undefined)
        setUDResult(undefined)

        // Check Address
        setIsAddress(utils.isAddress(value))

        // Warning
        checkSameAddress(value)

        // ENS
        if (ensEnabled) {
            searchEns(value, setEnsSearch, setEnsResult)
        }

        // UD
        searchUD(value, setUDSearch, setUDResult)

        // Yup
        setValue("address", value)
        setIsEnsSelected(false)
        setIsUDSelected(false)

        // Filter accounts
        setFilteredAccounts(
            filterAccounts(accounts, { term: value.toLowerCase() })
        )
    }

    const handleEnsClick = (result: EnsResult) => {
        setEnsSelected(result)
        setIsEnsSelected(!isEnsSelected)

        if (!isEnsSelected) {
            setValue("address", result.address, { shouldValidate: true })
            setIsAddress(true)
            setEnsSearch(result.address)
        } else {
            setValue("address", null)
            setEnsSearch("")
            setEnsResult(undefined)
            setIsAddress(false)
        }
    }

    const handleUDClick = (result: UDResult) => {
        setUDSelected(result)
        setIsUDSelected(!isUDSelected)

        if (!isUDSelected) {
            setValue("address", result.address, { shouldValidate: true })
            setIsAddress(true)
            setUDSearch(result.address)
        } else {
            setValue("address", null)
            setUDSearch("")
            setUDResult(undefined)
            setIsAddress(false)
        }
    }

    const onAccountSelect = (account: any) => {
        setValue("address", account.address, {
            shouldValidate: true,
        })
        setEnsSearch(account.address)
        setUDSearch(account.address)
        setIsAddress(true)
        setEnsResult(undefined)
        setUDResult(undefined)

        setFilteredAccounts(
            filterAccounts(accounts, { term: account.address.toLowerCase() })
        )
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
                        disabled={ensSearch === ""}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
        >
            {/* Search or Input */}
            <div className="flex flex-col space-y-2 fixed w-full bg-white z-10">
                <div className="w-full p-6 pb-0">
                    <SearchInput
                        label="Enter address or select contact"
                        placeholder={`Enter public address ${
                            ensEnabled ? "or search ENS" : ""
                        }`}
                        name="address"
                        ref={searchInputRef}
                        register={register}
                        error={errors.address?.message}
                        warning={warning}
                        autoFocus={false}
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
                        debounce
                    />
                </div>
            </div>
            <div
                className={classnames(
                    "pt-20",
                    warning !== "" ? "mt-5" : "mt-1"
                )}
            >
                {/* ENS Results */}
                {ensEnabled && ensResult && ensSearch ? (
                    <div className="flex flex-col space-y-2 p-6 pb-0">
                        <div
                            className={classnames(
                                "text-xs text-gray-500 pb-0 uppercase",
                                ensSearch.length > 2 ? "visible" : "hidden"
                            )}
                        >
                            ENS Result
                        </div>
                        {/*<div className="flex flex-col w-full">*/}
                        {ensResult ? (
                            <div
                                className={classnames(
                                    "flex flex-row text-sm items-center cursor-pointer mt-1 rounded-md transition-colors duration-300",
                                    isEnsSelected ? "bg-primary-100" : ""
                                )}
                                onClick={() => handleEnsClick(ensResult)}
                            >
                                <AccountDisplay
                                    account={
                                        {
                                            name: ensResult.name,
                                            address: ensResult.address,
                                        } as AccountInfo
                                    }
                                    selected={false}
                                    showAddress={true}
                                />
                                <img
                                    src={checkmarkMiniIcon}
                                    alt="checkmark"
                                    className={`
                                                absolute mr-8 right-0
                                                ${
                                                    isEnsSelected
                                                        ? "visible"
                                                        : "hidden"
                                                }
                                            `}
                                />
                            </div>
                        ) : (
                            <div
                                className={classnames(
                                    "text-base font-bold text-black w-full text-center mt-4",
                                    ensSearch.length >= 3 ? "visible" : "hidden"
                                )}
                            >
                                No corresponding ENS domain found
                            </div>
                        )}
                    </div>
                ) : null}

                {/* UD Results */}
                {udResult && udSearch ? (
                    <div className="flex flex-col space-y-2 p-6 pb-0">
                        <div
                            className={classnames(
                                "text-xs text-gray-500 pb-0 uppercase",
                                udSearch.length > 2 ? "visible" : "hidden"
                            )}
                        >
                            UD Result
                        </div>
                        {/*<div className="flex flex-col w-full">*/}
                        {udResult ? (
                            <div
                                className={classnames(
                                    "flex flex-row text-sm items-center cursor-pointer mt-1 rounded-md transition-colors duration-300",
                                    isUDSelected ? "bg-primary-100" : ""
                                )}
                                onClick={() => handleUDClick(udResult)}
                            >
                                <AccountDisplay
                                    account={
                                        {
                                            name: udResult.name,
                                            address: udResult.address,
                                        } as AccountInfo
                                    }
                                    selected={false}
                                    showAddress={true}
                                />
                                <img
                                    src={checkmarkMiniIcon}
                                    alt="checkmark"
                                    className={`
                                                absolute mr-8 right-0
                                                ${
                                                    isUDSelected
                                                        ? "visible"
                                                        : "hidden"
                                                }
                                            `}
                                />
                            </div>
                        ) : (
                            <div
                                className={classnames(
                                    "text-base font-bold text-black w-full text-center mt-4",
                                    udSearch.length >= 3 ? "visible" : "hidden"
                                )}
                            >
                                No corresponding UD domain found
                            </div>
                        )}
                    </div>
                ) : null}

                <AddressBookSelect
                    filter={ensSearch}
                    onSelect={onAccountSelect}
                />
                {filteredAccounts.length > 0 && (
                    <div className="flex flex-col p-6 space-y-5 text-sm text-gray-500 pb-3">
                        <AccountsList title="OTHER ACCOUNTS">
                            {filteredAccounts.map((account) => (
                                <AccountDisplay
                                    key={account.address}
                                    account={account}
                                    selected={ensSearch === account.address}
                                    showAddress={true}
                                    onClickAccount={onAccountSelect}
                                />
                            ))}
                        </AccountsList>
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default SendPage
