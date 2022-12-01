import { FunctionComponent, useState } from "react"
import { PopupTabs } from "@block-wallet/background/controllers/PreferencesController"
import { updatePopupTab } from "../../context/commActions"
import ActivityList from "./ActivityList"
import HorizontalSelect from "../input/HorizontalSelect"
import AssetsOverview from "./AssetsOverview"

const tabs = [
    {
        label: "Activity",
        component: ActivityList,
    },
    {
        label: "Assets",
        component: AssetsOverview,
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
        <>
            <HorizontalSelect
                options={tabs}
                value={tab}
                onChange={onTabChange}
                display={({ label }) => label}
                disableStyles
                containerClassName="sticky flex-row flex"
                optionClassName={(value) =>
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-300 ${
                        tab === value
                            ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                            : "border-gray-200 text-gray-500 border-b hover:text-primary-300 hover:font-medium"
                    }`
                }
            />
            <TabComponent />
        </>
    )
}

export default ActivityAssetsView
