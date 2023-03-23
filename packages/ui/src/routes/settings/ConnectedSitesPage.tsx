import { FunctionComponent, useMemo, useState } from "react"
import { SiteMetadata } from "@block-wallet/provider/types"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import AppIcon from "../../components/icons/AppIcon"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import { removeAccountFromSite } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { FaGlobe } from "react-icons/fa"
import { formatHashLastChars, formatName } from "../../util/formatAccount"
import Icon, { IconName } from "../../components/ui/Icon"

const ConnectedSite: FunctionComponent<{
    site: SiteMetadata
    origin: string
    onSiteClick: (origin: string) => void
    onDelete: (origin: string) => void
}> = ({ site, origin, onSiteClick, onDelete }) => {
    const [confirmOpen, setConfirmOpen] = useState(false)

    return (
        <div className="flex flex-row items-center justify-between w-full ">
            <div
                className="flex flex-row items-center space-x-4 w-11/12 hover:bg-primary-grey-hover rounded-md p-1 cursor-pointer "
                onClick={() => onSiteClick(origin)}
            >
                <div className="flex flex-row items-center justify-center w-10 h-10 p-2 rounded-full bg-primary-grey-default">
                    {site.iconURL ? (
                        <AppIcon iconURL={site.iconURL} size={10} />
                    ) : (
                        <FaGlobe size={24} />
                    )}
                </div>
                <span className="text-sm font-bold text-gray-800">
                    {new URL(origin).hostname}
                </span>
            </div>
            <button
                onClick={() => setConfirmOpen(true)}
                className="hover:bg-primary-grey-hover p-2 rounded-full"
            >
                <Icon name={IconName.TRASH_BIN} />
            </button>
            <ConfirmDialog
                title="Remove Site Connection"
                message={`Do you want to remove ${
                    new URL(origin).hostname
                } connection?`}
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => onDelete(origin)}
            />
        </div>
    )
}

const ConnectedSitesPage = () => {
    const account = useSelectedAccount()
    const state = useBlankState()!
    const history = useOnMountHistory()
    const fromAccountList = history.location.state?.fromAccountList

    const connectedSites = useMemo(() => {
        const permissions = Object.values(state.permissions)
        const res = permissions.filter((p) =>
            p.accounts.includes(state.selectedAddress)
        )

        return res
    }, [state.permissions, state.selectedAddress])

    const handleSiteClick = (origin: string) => {
        history.push({
            pathname: "/accounts/menu/connectedSites/accountList",
            state: { origin, fromAccountList },
        })
    }

    const handleDeleteClick = async (origin: string) => {
        try {
            await removeAccountFromSite(origin, state.selectedAddress)
        } catch {}
    }

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Connected Sites"
                    onBack={() => {
                        history.push({
                            pathname: "/accounts/menu",
                            state: { fromAccountList },
                        })
                    }}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6">
                <span className="text-sm text-primary-grey-dark">
                    <span
                        className="font-bold text-primary-black-default"
                        title={account.name}
                    >
                        {formatName(account.name, 30)}
                    </span>
                    <span
                        className="font-bold text-primary-black-default"
                        title={account.address}
                    >
                        {" "}
                        {formatHashLastChars(account.address)}
                    </span>
                    {connectedSites.length > 0
                        ? " is connected to these sites. They can view your account address."
                        : " is not connected to any site."}
                </span>
                {connectedSites.length > 0 && (
                    <div className="flex flex-col space-y-2">
                        {connectedSites.map((permission, i) => (
                            <ConnectedSite
                                key={i}
                                site={permission.data}
                                origin={permission.origin}
                                onSiteClick={handleSiteClick}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </PopupLayout>
    )
}

export default ConnectedSitesPage
