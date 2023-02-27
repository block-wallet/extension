import { FunctionComponent, useState } from "react"
import { PopupTabs } from "@block-wallet/background/controllers/PreferencesController"
import { updatePopupTab } from "../context/commActions"
import ActivityList from "./ActivityList"
import AssetsList from "./AssetsList"
import HorizontalSelect from "./input/HorizontalSelect"

const tabs = [
    {
        label: "Activity",
        component: ActivityList,
    },
    {
        label: "Assets",
        component: AssetsList,
    },
]

const ActivityAssetsView: FunctionComponent<{ initialTab: PopupTabs }> = ({
    initialTab,
}) => {
    const initialTabIndex = initialTab === "activity" ? 0 : 1
    const [tab, setTab] = useState(tabs[initialTabIndex])
    const TabComponent = tab.component

    const onTabChange = async (value: any) => {
        setTab(value)
        updatePopupTab(value.label.toLowerCase() as PopupTabs)
    }

    return (
        <div className="flex flex-col w-full">
            <HorizontalSelect
                options={tabs}
                value={tab}
                onChange={onTabChange}
                display={(t) => t.label}
                disableStyles
                optionClassName={(value) =>
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-blue-default ${
                        tab === value
                            ? "border-primary-blue-default border-b-2 text-primary-blue-default font-bold"
                            : "border-gray-200 text-gray-500 border-b hover:text-primary-blue-default hover:font-medium"
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

export default ActivityAssetsView
