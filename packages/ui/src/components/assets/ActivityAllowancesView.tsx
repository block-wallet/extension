import { useState } from "react"
import { classnames } from "../../styles"

import useAccountAllowances from "../../context/hooks/useAccountAllowances"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { AllowancesFilters } from "../allowances/AllowancesFilterButton"

import HorizontalSelect from "../input/HorizontalSelect"
import AssetActivity from "./AssetActivity"
import AssetAllowances from "./AssetAllowances"

export enum TabLabels {
    ACTIVITY = "Activity",
    ALLOWANCES = "Allowances",
}

const tabs = [
    {
        label: TabLabels.ACTIVITY,
        component: AssetActivity,
    },
    {
        label: TabLabels.ALLOWANCES,
        component: AssetAllowances,
    },
]

const ActivityAllowancesView = () => {
    const history = useOnMountHistory()

    const [tab, setTab] = useState(
        history.location.state.tab === TabLabels.ALLOWANCES ? tabs[1] : tabs[0]
    )
    const TabComponent = tab.component
    const tokenAddress: string = history.location.state.address

    const allowances = useAccountAllowances(
        AllowancesFilters.TOKEN,
        tokenAddress
    )[0]?.allowances

    const onTabChange = async (value: any) => {
        setTab(value)
    }

    return (
        <div className="flex flex-col w-full !mt-0">
            <HorizontalSelect
                options={tabs}
                value={tab}
                onChange={onTabChange}
                display={(t) =>
                    t.label === TabLabels.ALLOWANCES && allowances?.length > 0
                        ? `${t.label} (${allowances.length})`
                        : t.label
                }
                disableStyles
                optionClassName={(value) =>
                    classnames(
                        "flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-primary-blue-default",
                        tab === value
                            ? "border-primary-blue-default border-b-2 text-primary-blue-default font-bold"
                            : "border-primary-grey-hover text-gray-500 border-b hover:font-medium"
                    )
                }
                containerClassName="flex flex-row -ml-6 !mt-0 w-[calc(100%+3rem)]"
            />
            <div className="flex flex-col w-full">
                <TabComponent />
            </div>
        </div>
    )
}

export default ActivityAllowancesView
