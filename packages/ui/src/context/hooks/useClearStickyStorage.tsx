import { useLocationRecovery } from "../../util/hooks/useLocationRecovery"
import { clearVolatileLocalStorageItems } from "../../util/localSotrage"

const useClearStickyStorage = () => {
    const { clear: clearLocationRecovery } = useLocationRecovery()
    return {
        clear: () => {
            //By doing this, we clean the local variable that indicates where to recover the location
            clearLocationRecovery()
            //By doing this, we clean all the localStorage data used for forms like deposits and send.
            clearVolatileLocalStorageItems()
        },
    }
}
export default useClearStickyStorage
