import { useState } from "react"

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
        history.location.state?.tab === TabLabels.ALLOWANCES ? tabs[1] : tabs[0]
    )
    const TabComponent = tab.component
    const tokenAddress: string = history.location.state?.address

    const allowances = useAccountAllowances(
        AllowancesFilters.TOKEN,
        tokenAddress
    )[0]?.allowances

    const onTabChange = async (value: any) => {
        setTab(value)
    }

    if (!tokenAddress) {
        return (
            <div className="flex items-center justify-center flex-1 p-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Token address not found
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col w-full">
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
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-blue-default dark:hover:text-primary-blue-400 transition-colors duration-200 ${tab === value
                        ? "border-primary-blue-default dark:border-primary-blue-400 border-b-2 text-primary-blue-default dark:text-primary-blue-400 font-semibold"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 border-b hover:text-primary-blue-default dark:hover:text-primary-blue-400 font-medium"
                    }`
                }
                containerClassName="flex flex-row -ml-6"
                containerStyle={{ width: "calc(100% + 2 * 1.5rem)" }}
            />
            <div className="flex flex-col w-full">
                <TabComponent />
            </div>
        </div>
    )
}

export default ActivityAllowancesView
