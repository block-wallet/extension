import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import React, { FunctionComponent, useMemo, useState, useEffect } from "react"
import { useAddressBook } from "../../context/hooks/useAddressBook"
import AccountDisplay from "../account/AccountDisplay"
import { filterAccounts } from "../../util/filterAccounts"

const AddressBookSelect: FunctionComponent<{
    filter: string
    onSelect: (account: any) => void
}> = ({ filter, onSelect }) => {
    const addressBook = useAddressBook()
    const accounts = useMemo(() => {
        const addresses = Object.values(addressBook)
        const accountArray = addresses
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => {
                return { name: a.name, address: a.address } as AccountInfo
            })
        return accountArray
    }, [addressBook])

    const [filteredAccounts, setFilteredAccounts] = useState<AccountInfo[]>(
        accounts
    )

    const [selected, setSelected] = useState<AccountInfo>()

    useEffect(() => {
        if (accounts.length) {
            setFilteredAccounts(
                filterAccounts(accounts, { term: filter.toLowerCase() })
            )
            if (filter !== selected?.address) setSelected(undefined)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts, filter])

    return filteredAccounts.length > 0 ? (
        <div className="flex flex-col w-full space-y-2 p-6 pb-0">
            <span className="p-0 text-xs text-gray-500 uppercase ">
                Address Book Contacts
            </span>
            {filteredAccounts.map((account) => (
                <AccountDisplay
                    key={account.address}
                    onClickAccount={(account: any) => {
                        setSelected(account)
                        onSelect(account)
                    }}
                    account={account}
                    selected={selected?.address === account.address}
                    showAddress={true}
                />
            ))}
        </div>
    ) : null
}

export default AddressBookSelect
