import { FC, Fragment, useEffect, useState } from "react"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"
import { AssetsSortOptions } from "../../util/tokenUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { setHideSmallBalances } from "../../context/commActions"
interface AssetsSortProps {
    selectedValue: string
    onClick: (selectedValue: AssetsSortOptions) => void
}

const AssetsSort: FC<AssetsSortProps> = ({ selectedValue, onClick }) => {
    const { nativeCurrency, hideSmallBalances } = useBlankState()!
    const [hideSmallBalancesChk, setHideSmallBalancesChk] =
        useState(hideSmallBalances)

    useEffect(() => {
        setHideSmallBalances(hideSmallBalancesChk)
    }, [hideSmallBalancesChk])

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
                <Dropdown.Menu id="filter-menu" className="w-40 py-2 mt-0">
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

                    <hr className="border-0.5 border-primary-grey-hover w-full my-1" />
                    <label
                        className="p-2 pl-3 pr-1 text-xs text-primary-grey-dark font-normal cursor-pointer"
                        htmlFor="hideSmallBalances"
                    >
                        Hide Small Balances
                    </label>
                    <input
                        id="hideSmallBalances"
                        type="checkbox"
                        className="border-2 border-primary-grey-hover rounded-md focus:ring-0 cursor-pointer ml-2"
                        checked={hideSmallBalancesChk}
                        onChange={() =>
                            setHideSmallBalancesChk(!hideSmallBalancesChk)
                        }
                    />
                </Dropdown.Menu>
            </Dropdown>
        </div>
    )
}

export default AssetsSort
