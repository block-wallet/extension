import { createContext } from "react"
import type { ResponseGetAppState } from "@block-wallet/background/utils/types/communication"

export type BackgroundStateType = {
    blankState?: ResponseGetAppState
}

export const initBackgroundState: BackgroundStateType = {}

const BackgroundContext: React.Context<BackgroundStateType> =
    createContext<BackgroundStateType>(initBackgroundState)

export default BackgroundContext
