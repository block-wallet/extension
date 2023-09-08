import { FC, Fragment } from "react"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"
import { AssetsSortOptions } from "../../util/tokenUtils"
import { useBlankState } from "../../context/background/backgroundHooks"

interface AssetsSortProps {
    selectedValue: string
    onClick: (selectedValue: AssetsSortOptions) => void
}

const AssetsSort: FC<AssetsSortProps> = ({ selectedValue, onClick }) => {
    const { nativeCurrency } = useBlankState()!

    const sortOptions = [
        { label: "Name", value: AssetsSortOptions.NAME },
        { label: "Balance", value: AssetsSortOptions.BALANCE },
        {
            label: nativeCurrency.toUpperCase() + " Value",
            value: AssetsSortOptions.USD_VALUE,
        },
        { label: "Stablecoins", value: AssetsSortOptions.STABLECOINS },
        { label: "Custom Order", value: AssetsSortOptions.CUSTOM },
    ]

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
                        buttonClassName="h-10"
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
                                    className="p-1 px-3 font-semibold text-primary-black-default"
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
