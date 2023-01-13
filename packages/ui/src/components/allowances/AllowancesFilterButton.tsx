import { Fragment, useState } from "react"
import Badge from "../ui/Badge"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"

export enum AllowancesFilters {
    TOKEN = "TOKEN",
    SPENDER = "SPENDER",
}

const filterOptions = [
    { label: "Token", value: AllowancesFilters.TOKEN },
    { label: "Spender", value: AllowancesFilters.SPENDER },
]

const AllowancesFilterButton = ({
    filter,
    onChangeFilter,
}: {
    filter: AllowancesFilters
    onChangeFilter: (newFilter: AllowancesFilters) => void
}) => {
    const [showBadge, setShowBadge] = useState(false)
    return (
        <div className="relative text-sm text-primary-300">
            <Dropdown
                onClickItem={(selected) => {
                    setShowBadge(true)
                    onChangeFilter(selected)
                }}
            >
                <Dropdown.Button>
                    <DropdownOutlinedIconButton iconName={IconName.GROUP} />
                </Dropdown.Button>
                <Dropdown.Menu id="filter-menu" className="w-36 py-2">
                    <div className="p-2 px-3 text-xs text-gray-600 font-normal">
                        GROUP BY
                    </div>
                    {filterOptions.map(({ value, label }) => {
                        return (
                            <Fragment key={value}>
                                <Dropdown.MenuItem
                                    value={value}
                                    selected={filter === value}
                                    className="p-2 px-3 font-semibold text-black"
                                >
                                    {label}
                                </Dropdown.MenuItem>
                            </Fragment>
                        )
                    })}
                </Dropdown.Menu>
            </Dropdown>
            {showBadge && <Badge>{filter[0]}</Badge>}
        </div>
    )
}

export default AllowancesFilterButton
