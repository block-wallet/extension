import { Fragment } from "react"
import Badge from "../ui/Badge"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownOutlinedIconButton } from "../ui/Dropdown/DropdownButton"
import { IconName } from "../ui/Icon"

export enum ChainFilters {
    TESTNET = "TESTNET",
    ENABLED = "ENABLED",
}

const handleOnChange = (
    selected: ChainFilters,
    currentFilters: ChainFilters[]
) => {
    const idxToRemove = (currentFilters || []).findIndex(
        (filter) => filter === selected
    )
    if (idxToRemove > -1) {
        const newFilters = [...currentFilters]
        newFilters.splice(idxToRemove, 1)
        return newFilters
    }
    return currentFilters ? [...currentFilters, selected] : [selected]
}

const getFilterOptions = () => {
    return [
        { label: "Testnets", value: ChainFilters.TESTNET },
        { label: "Enabled", value: ChainFilters.ENABLED },
    ]
}

interface ChainFiltersProps {
    filters: ChainFilters[]
    onChangeFilters: (newFilters: ChainFilters[]) => void
}

const ChainFiltersButton: React.FC<ChainFiltersProps> = ({
    filters,
    onChangeFilters,
}) => {
    return (
        <div className="relative text-sm text-primary-300">
            <Dropdown
                onClickItem={(selected) => {
                    return onChangeFilters(handleOnChange(selected, filters))
                }}
            >
                <Dropdown.Button>
                    <DropdownOutlinedIconButton iconName={IconName.GROUP} />
                </Dropdown.Button>
                <Dropdown.Menu id="filter-menu" className="w-28">
                    {getFilterOptions().map(({ value, label }) => {
                        return (
                            <Fragment key={value}>
                                <Dropdown.MenuItem
                                    value={value}
                                    selected={filters.includes(value)}
                                    className="p-2 font-normal text-black"
                                >
                                    {label}
                                </Dropdown.MenuItem>
                            </Fragment>
                        )
                    })}
                </Dropdown.Menu>
            </Dropdown>
            {filters.length > 0 && <Badge>{filters.length}</Badge>}
        </div>
    )
}

export default ChainFiltersButton
