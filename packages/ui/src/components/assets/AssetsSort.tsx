import { FC, Fragment, useEffect, useState } from "react"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import Icon, { IconName } from "../ui/Icon"
import { AssetsSortOptions } from "../../util/tokenUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import ExpandableItem from "../bridge/ExpandableItem"
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
                <Dropdown.Menu
                    id="sort-dropdown"
                    className="w-36 py-2 !mt-1 border-2"
                >
                    <ExpandableItem
                        className="ml-2"
                        expandable
                        expanded={
                            <>
                                {sortOptions.map(({ value, label }) => {
                                    return (
                                        <Fragment key={value}>
                                            <Dropdown.MenuItem
                                                value={value}
                                                selected={
                                                    selectedValue === value
                                                }
                                                className="p-1 px-3 font-semibold text-primary-black-default"
                                            >
                                                {label}
                                            </Dropdown.MenuItem>
                                        </Fragment>
                                    )
                                })}
                            </>
                        }
                    >
                        <div className="p-2 text-xs text-black font-normal">
                            SORT BY
                        </div>
                    </ExpandableItem>
                    <hr className="border-0.5 border-primary-grey-hover w-full" />
                    <div className="p-2 text-xs text-black font-normal ml-7">
                        HIDE
                    </div>
                    <div className="flex flex-row items-center">
                        <label
                            onClick={() =>
                                setHideSmallBalancesChk(!hideSmallBalancesChk)
                            }
                            className=" cursor-pointer font-semibold pl-2 w-4/5 ml-1 text-primary-black-default"
                        >
                            Small balances
                        </label>
                        {hideSmallBalancesChk && (
                            <Icon
                                size="sm"
                                name={IconName.CHECKMARK}
                                profile="selected"
                                className="ml-1"
                            />
                        )}
                    </div>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    )
}

export default AssetsSort
