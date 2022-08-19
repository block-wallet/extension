import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { useMergeRefs } from "../../context/hooks/useMergeRefs"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import SearchInput from "../../components/input/SearchInput"

import classnames from "classnames"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { utils } from "ethers"

import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import AccountSearchResults, {
    AccountResult,
} from "../../components/account/AccountSearchResults"

const schema = yup.object().shape({
    address: yup
        .string()
        .required("No address provided.")
        .test("is-correct", "Address is incorrect", (address) => {
            return utils.isAddress(address || "")
        }),
})
type AddressFormData = { address: string }

const WithdrawExternalPage = () => {
    const {
        register,
        handleSubmit,
        setValue,

        formState: { errors },
    } = useForm<AddressFormData>({
        resolver: yupResolver(schema),
    })
    const history: any = useOnMountHistory()
    const currentAccount = useSelectedAccount()
    const { pair, preSelectedAsset, isAssetDetailsPage } = history.location
        .state as {
        pair: CurrencyAmountPair
        preSelectedAsset: TokenWithBalance
        isAssetDetailsPage: boolean
    }

    // State
    const [selectedAccount, setSelectedAccount] = useState<AccountResult>()
    const [searchString, setSearchString] = useState<string>("")
    const [warning, setWarning] = useState<string>("")
    const [isAddress, setIsAddress] = useState<boolean>(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Functions
    const checkSameAddress = (value: string) => {
        if (value.toLowerCase() === currentAccount.address.toLowerCase()) {
            setWarning("Warning: You are trying to send to your own address.")
        } else setWarning("")
    }

    // Handlers
    const onChangeHandler = async (event: any) => {
        // Bind
        const value = event.target.value
        setValue("address", value)
        setSearchString(value)
    }

    useEffect(() => {
        const checkAddress = async () => {
            // Check Address
            setIsAddress(utils.isAddress(searchString))

            // Warning
            checkSameAddress(searchString)
        }

        checkAddress()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchString])

    const onAccountSelect = (account: any) => {
        setSelectedAccount(account)
        setValue("address", account.address, {
            shouldValidate: true,
        })
        setSearchString(account.address)
        setIsAddress(true)
    }

    const onSubmit = handleSubmit(async (data: AddressFormData) => {
        history.push({
            pathname: "/privacy/withdraw/block/accounts/step/confirm",
            state: {
                address: data.address,
                pair,
                name: selectedAccount?.name,
                external: true,
                isAssetDetailsPage,
            },
        })
    })

    const goToSide = () => {
        if (!searchInputRef.current) return

        const len = searchInputRef.current.value.length
        searchInputRef.current.setSelectionRange(len, len)
    }

    const { ref } = register("address")

    return (
        <form className="w-full h-full" onSubmit={onSubmit}>
            <PopupLayout
                header={
                    <PopupHeader
                        title="Withdraw From Privacy Pool"
                        onBack={() => {
                            history.push({
                                pathname: "/privacy/withdraw/select",
                                state: {
                                    pair,
                                    preSelectedAsset,
                                    isAssetDetailsPage,
                                },
                            })
                        }}
                    />
                }
                footer={
                    <PopupFooter>
                        <ButtonWithLoading label="Next" disabled={!isAddress} />
                    </PopupFooter>
                }
            >
                <div className="flex flex-col space-y-2 fixed w-full bg-white z-10">
                    <div className="w-full p-6 pb-0">
                        <SearchInput
                            label="Enter address or select contact"
                            placeholder="Enter public address, name or select contact"
                            name="address"
                            ref={useMergeRefs(ref, searchInputRef)}
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
                            debounced
                        />
                    </div>
                </div>

                <div
                    className={classnames(
                        "pt-28 pb-6 space-y-4",
                        warning !== "" ? "mt-5" : "mt-1"
                    )}
                >
                    <AccountSearchResults
                        filter={searchString}
                        onSelect={onAccountSelect}
                        resultsToDisplay={{
                            wallet: false,
                            addressBook: true,
                            ens: true,
                            ud: true,
                        }}
                    />
                </div>
            </PopupLayout>
        </form>
    )
}

export default WithdrawExternalPage
