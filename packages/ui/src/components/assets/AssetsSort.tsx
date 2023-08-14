import { FC, Fragment } from "react"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"

export interface SortOptions {
    value: string
    label: string
}

export const sortOptions: SortOptions[] = [
    { value: "Balance", label: "Balance" },
    { value: "USDValue", label: "USD Value" },
    { value: "Name", label: "Name" },
    { value: "Custom", label: "Custom" },
]

export enum sortOptionsEnum {
    BALANCE = "Balance",
    USDVALUE = "USD Value",
    NAME = "Name",
    CUSTOM = "Custom",
}

interface AssetsSortProps {
    selectedValue: string
    onClick: (selectedValue: string) => void
}

const AssetsSort: FC<AssetsSortProps> = ({ selectedValue, onClick }) => {
    return (
        <div className="relative text-sm text-primary-blue-default">
            <Dropdown
                onClickItem={(selected) => {
                    onClick(selected)
                }}
            >
                <Dropdown.Button>
                    <DropdownOutlinedIconButton iconName={IconName.GROUP} />
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
