import { FunctionComponent, useState } from "react"
import { PopupTabs } from "@block-wallet/background/controllers/PreferencesController"
import { updatePopupTab } from "../../context/commActions"
import ActivityList from "./ActivityList"
import AssetsList from "../AssetsList"
import HorizontalSelect from "../input/HorizontalSelect"

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
        <div className="flex flex-col w-full h-full">
            <HorizontalSelect
                options={tabs}
                value={tab}
                onChange={onTabChange}
                display={({ label }) => label}
                disableStyles
                optionClassName={(value) =>
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-300 ${
                        tab === value
                            ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                            : "border-gray-200 text-gray-500 border-b hover:text-primary-300 hover:font-medium"
                    }`
                }
            />
            <div className="flex flex-col w-full h-full">
                <TabComponent />
            </div>
        </div>
    )
}

export default ActivityAssetsView
