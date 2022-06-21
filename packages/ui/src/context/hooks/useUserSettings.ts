import { useBlankState } from '../background/backgroundHooks'

export const useUserSettings = () => {
    const { settings } = useBlankState()!
    return { ...settings }
}