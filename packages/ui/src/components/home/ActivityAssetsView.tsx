import { PopupTabs } from "@block-wallet/background/controllers/PreferencesController"
import { FunctionComponent, useEffect, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { useBlankState } from "../../context/background/backgroundHooks"
import { updatePopupTab } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ActivityList from "./../ActivityList"
import AssetsList from "./AssetsList"
import HorizontalSelect from "./../input/HorizontalSelect"
import { componentsHotkeys } from "../../util/hotkeys"

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
    const { popupTab, hotkeysEnabled } = useBlankState()!
    const initialTabIndex = initialTab === "activity" ? 0 : 1
    const [tab, setTab] = useState(tabs[initialTabIndex])
    const [currentTabLabel, setCurrentTabLabel] = useState(tab.label)
    const TabComponent = tab.component

    const onTabChange = (value: {
        label: string
        component: () => JSX.Element
    }) => {
        setTab(value)
        updatePopupTab(value.label.toLowerCase() as PopupTabs)
    }

    //UseHotkeys changes state.popupTab, we do it to change the tab in real time, otherwise it will change only next time we open the extension
    useEffect(() => {
        setCurrentTabLabel(popupTab)
        if (popupTab !== tab.label.toLocaleLowerCase()) {
            const newTab = tabs.find(
                (l) => l.label.toLocaleLowerCase() === popupTab
            )
            if (newTab) onTabChange(newTab)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [popupTab])

    //Adding useHotkey to add new token, only on Assets View
    const activityAssetsViewHotkeys = componentsHotkeys.ActivityAssetsView
    useHotkeys(activityAssetsViewHotkeys, () => {
        if (!hotkeysEnabled) return
        if (currentTabLabel.toLocaleLowerCase() === "assets") {
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
                    `flex-1 flex flex-row items-center justify-center p-3 text-sm hover:text-primary-blue-default ${
                        tab === value
                            ? "border-primary-blue-default border-b-2 text-primary-blue-default font-semibold"
                            : "border-primary-grey-hover text-primary-grey-dark border-b hover:text-primary-blue-default font-medium"
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
