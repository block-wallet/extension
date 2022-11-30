import { PopupTabs } from "@block-wallet/background/controllers/PreferencesController"
import { FunctionComponent, useEffect, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../context/background/backgroundHooks"
import { updatePopupTab } from "../context/commActions"
import { useOnMountHistory } from "../context/hooks/useOnMount"
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
    const history = useOnMountHistory()
    const state = useBlankState()!
    const initialTabIndex = initialTab === "activity" ? 0 : 1
    const [tab, setTab] = useState(tabs[initialTabIndex])
    const [currentTabLabel, setCurrentTabLabel] = useState(tab.label)
    const TabComponent = tab.component

    const onTabChange = (value: {
        label: string
        component: () => JSX.Element
    }) => {
        console.log("New value: " + value)
        setTab(value)
        // updatePopupTab(value.label.toLowerCase() as PopupTabs)
    }

    //UseHotkeys changes state.popupTab, we do it to change the tab in real time, otherwise it will change only next time we open the extension
    useEffect(() => {
        if (state.popupTab !== tab.label.toLocaleLowerCase()) {
            const newTab = tabs.find(
                (l) => l.label.toLocaleLowerCase() === state.popupTab
            )
            if (newTab) onTabChange(newTab)
        }
    }, [state.popupTab])

    //Adding useHotkey to add new token, only on Assets View
    useHotkeys("alt+n", () => {
        console.log("Entra")
        console.log(tab.label)
        console.log(state.popupTab)
        console.log(currentTabLabel)
        if (currentTabLabel === "Assets") {
            history.push({
                pathname: "/settings/tokens/add",
                state: {
                    from: history.location.pathname,
                },
            })
        }
    })

    return (
        <div className="flex flex-col w-full">
            <HorizontalSelect
                options={tabs}
                value={tab}
                onChange={onTabChange}
                display={(t) => t.label}
                disableStyles
                optionClassName={(value) =>
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-300 ${
                        tab === value
                            ? "border-primary-300 border-b-2 text-primary-300 font-bold"
                            : "border-gray-200 text-gray-500 border-b hover:text-primary-300 hover:font-medium"
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
