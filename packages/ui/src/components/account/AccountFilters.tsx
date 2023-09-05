import { Fragment } from "react"
import {
    AccountFilter,
    getAccountFilterValue,
    getNextAccountFilterValue,
} from "../../util/filterAccounts"
import Divider from "../Divider"
import Badge from "../ui/Badge"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"

const getFilterOptions = (customFilters?: AccountFilter[]) => {
    const filterOptions = [
        { label: "All", value: AccountFilter.ALL },
        { label: "Hardware", value: AccountFilter.HARDWARE },
        { label: "External", value: AccountFilter.EXTERNAL },
        { label: "Hidden", value: AccountFilter.HIDDEN, divider: true },
    ]
    if (!customFilters) {
        return filterOptions
    }
    return filterOptions.filter(({ value }) => customFilters.includes(value))
}

interface AccountFilterProps {
    filters: string[]
    customFilters?: AccountFilter[]
    onChangeFilters: (newFilters: string[]) => void
    searchButtonClassName?: string
}

const AccountFilters: React.FC<AccountFilterProps> = ({
    filters,
    onChangeFilters,
    customFilters,
}) => {
    const selectedFilters = getAccountFilterValue(filters)
    const badgeCount = selectedFilters.filter(
        (f) =>
            ![AccountFilter.ALL, AccountFilter.HIDDEN].includes(
                f as AccountFilter
            )
    )
    return (
        <div className="relative" title="Filter accounts">
            <Dropdown
                onClickItem={(selected) => {
                    return onChangeFilters(
                        getNextAccountFilterValue(selected, filters)
                    )
                }}
            >
                <Dropdown.Button>
                    <DropdownOutlinedIconButton
                        iconName={IconName.FILTER}
                        iconSize="lg"
                    />
                </Dropdown.Button>
                <Dropdown.Menu id="filter-menu" className="w-28">
                    {getFilterOptions(customFilters).map(
                        ({ value, label, divider }) => {
                            return (
                                <Fragment key={value}>
                                    {divider && <Divider />}
                                    <Dropdown.MenuItem
                                        value={value}
                                        selected={selectedFilters.includes(
                                            value
                                        )}
                                        className="p-2 font-normal text-primary-black-default"
                                    >
                                        {label}
                                    </Dropdown.MenuItem>
                                </Fragment>
                            )
                        }
                    )}
                </Dropdown.Menu>
            </Dropdown>
            {badgeCount.length > 0 && <Badge>{badgeCount.length}</Badge>}
        </div>
    )
}

export default AccountFilters
