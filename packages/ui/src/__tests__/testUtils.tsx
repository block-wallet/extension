import { FunctionComponent, PropsWithChildren } from "react"
import { render } from "@testing-library/react"
import MockBackgroundState from "../mock/MockBackgroundState"
import { BackgroundStateType } from "../context/background/backgroundContext"

export const renderWithBackgroundProvider = (
    ui: JSX.Element,
    {
        assignBlankState,
    }: { assignBlankState?: Partial<BackgroundStateType["blankState"]> }
) => {
    const Wrapper: FunctionComponent<
        PropsWithChildren<{
            assignBlankState?: Partial<BackgroundStateType["blankState"]>
        }>
    > = ({ children }) => (
        <MockBackgroundState assignBlankState={assignBlankState}>
            {children}
        </MockBackgroundState>
    )
    return render(ui, { wrapper: Wrapper })
}
