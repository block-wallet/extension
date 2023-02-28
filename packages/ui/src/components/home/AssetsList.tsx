import { Fragment, FunctionComponent, useState } from "react"
import { TokenList } from "../../context/hooks/useTokensList"
import { useBlankState } from "../../context/background/backgroundHooks"
import AssetItem from "./AssetItem"

const AssetsList: FunctionComponent<{ assets: TokenList }> = ({ assets }) => {
    const state = useBlankState()!

    const [deletedTokens, setDeletedTokens] = useState([] as string[])
    const pushDeleteTokens = (deleteToken: string) => {
        setDeletedTokens([...deletedTokens, deleteToken])
    }

    // the action of delete a token is not sync, we include this blick of code for not showing deleted tokens while they are being deleted.
    const newDeleted: string[] = []
    deletedTokens.forEach((t) => {
        if (assets.map((a) => a.token.address).includes(t)) {
            newDeleted.push(t)
        }
    })
    if (deletedTokens.length !== newDeleted.length) {
        setDeletedTokens(newDeleted)
    }

    return (
        <div
            className="flex flex-col flex-1 w-full space-y-0"
            role="list"
            aria-label="assets"
        >
            {assets
                .filter((t) => !deletedTokens.includes(t.token.address))
                .map((asset, i) => (
                    <Fragment key={asset.token.address}>
                        <div className="px-6">
                            {i > 0 ? <hr /> : null}
                            <AssetItem
                                asset={asset}
                                pushDeleteTokens={pushDeleteTokens}
                            />
                        </div>
                    </Fragment>
                ))}
        </div>
    )
}

export default AssetsList
