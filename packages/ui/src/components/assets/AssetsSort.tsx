import { FC, Fragment } from "react"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"

interface AssetsSortProps {
    selectedValue: string
    onClick: (selectedValue: string) => void
}

export const sortOptions = [
    { label: "Name", value: "NAME" },
    { label: "Balance", value: "BALANCE" },
    { label: "USD Value", value: "USDVALUE" },
    { label: "Stablecoins", value: "STABLECOINS" },
    { label: "Custom Order", value: "CUSTOM" },
]

const AssetsSort: FC<AssetsSortProps> = ({ selectedValue, onClick }) => {
    return (
        <div className="relative text-sm text-primary-blue-default">
            <Dropdown
                onClickItem={(selected) => {
                    onClick(selected)
                }}
            >
                <Dropdown.Button>
                    <DropdownOutlinedIconButton
                        iconName={IconName.GROUP}
                        className="h-10"
                    />
                </Dropdown.Button>
                <Dropdown.Menu id="filter-menu" className="w-36 py-2">
                    <div className="p-2 px-3 text-xs text-primary-grey-dark font-normal">
                        SORT BY
                    </div>
                    {sortOptions.map(({ value, label }) => {
                        return (
                            <Fragment key={value}>
                                <Dropdown.MenuItem
                                    value={value}
                                    selected={selectedValue === value}
                                    className="p-2 px-3 font-semibold text-primary-black-default"
                                >
                                    {label}
                                </Dropdown.MenuItem>
                            </Fragment>
                        )
                    })}
                </Dropdown.Menu>
            </Dropdown>
        </div>
    )
}

export default AssetsSort
