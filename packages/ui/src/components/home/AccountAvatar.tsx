import { useBlankState } from "../../context/background/backgroundHooks"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { formatHash, formatName } from "../../util/formatAccount"
import useCopyToClipboard from "../../util/hooks/useCopyToClipboard"
import CopyTooltip from "../label/СopyToClipboardTooltip"

const AccountAvatar = () => {
    const blankState = useBlankState()!
    const accountAddress = blankState.selectedAddress
    const account = useSelectedAccount()
    const { onCopy, copied } = useCopyToClipboard()

    return (
        <button
            type="button"
            className="relative flex flex-col group"
            onClick={() => onCopy(accountAddress)}
        >
            <span className="text-sm font-bold" data-testid="account-name">
                {formatName(account.name, 18)}
            </span>
            <span className="text-xs text-gray-600 truncate">
                {formatHash(accountAddress)}
            </span>
            <CopyTooltip copied={copied} />
        </button>
    )
}
export default AccountAvatar
