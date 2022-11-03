import CheckmarkCircle from "../icons/CheckmarkCircle"
import Tooltip from "../label/Tooltip"
import Spinner from "../../components/spinner/ThinSpinner"
import { CgDanger } from "react-icons/cg"
import { AiOutlineWarning } from "react-icons/ai"
import classnames from "classnames"

export enum IconURLValidation {
    CUSTOM_ICON = "CUSTOM_ICON",
}

export enum ChainIdValidation {
    KNOWN_CHAIN_ID = "KNOWN_CHAIN_ID",
    UNKNOWN_CHAIN_ID = "UNKNOWN_CHAIN_ID",
}

export enum BlockExplorerValidation {
    KNOWN_EXPLORER = "KNOWN_EXPLORER",
    UNKNOWN_EXPLORER = "UNKNOWN_EXPLORER",
}

export enum RPCUrlValidation {
    //Empty URL
    EMPTY,
    //Empty validation as we don't know the specified chain id.
    EMPTY_UNKNOWN_CHAIN,
    //Chain ID matches with the one configured, and the endpoint is recognized by the background
    VERIFIED_ENDPOINT,
    //Chain ID doesn't match the one configured
    CHAIN_ID_DOESNT_MATCH,
    //Chain ID matches with the one configured, but the endpoint is not recognized by the background
    UNVERIFIED_ENDPOINT,
    //Invalid URL
    INVALID_URL,
    //The URL is valid but it's not a node endpoint
    INVALID_ENDPOINT,
}

const RPCValidationEndLabelInfo = ({
    isValidating,
    rpcValidation,
    currentChainId,
    toolTipClassName,
    wrapperClassName,
}: {
    isValidating: boolean
    toolTipClassName?: string
    wrapperClassName?: string
    rpcValidation:
        | RPCUrlValidation
        | BlockExplorerValidation
        | ChainIdValidation
        | IconURLValidation
    currentChainId?: string
}) => {
    if (isValidating) {
        return <Spinner />
    }
    const withWrapper = (child: any) => {
        return (
            <span
                className={classnames(
                    "flex flex-row items-center text-xxs z-20 group relative",
                    wrapperClassName
                )}
            >
                {child}
            </span>
        )
    }
    switch (rpcValidation) {
        case RPCUrlValidation.CHAIN_ID_DOESNT_MATCH: {
            return withWrapper(
                <>
                    <CgDanger className="w-4 h-4 text-red-700 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content={`Invalid node endpoint for Chain ${currentChainId}.`}
                    />
                </>
            )
        }
        case RPCUrlValidation.INVALID_URL: {
            return withWrapper(
                <>
                    <CgDanger className="w-4 h-4 text-red-700 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="The RPC URL is invalid so it can't be verified."
                    />
                </>
            )
        }
        case RPCUrlValidation.INVALID_ENDPOINT: {
            return withWrapper(
                <>
                    <CgDanger className="w-4 h-4 text-red-700 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="The URL is valid but it's not an RPC node endpoint."
                    />
                </>
            )
        }
        case RPCUrlValidation.UNVERIFIED_ENDPOINT: {
            return withWrapper(
                <>
                    <AiOutlineWarning
                        className={classnames(
                            "w-4 h-4 z-20",
                            "text-yellow-400"
                        )}
                    />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-full !border !border-gray-200 !w-56 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="This node endpoint is not recognized by BlockWallet. Please make sure that this configuration will not compromise your funds."
                    />
                </>
            )
        }
        case RPCUrlValidation.VERIFIED_ENDPOINT: {
            return withWrapper(
                <>
                    <CheckmarkCircle classes="w-4 h-4 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="Verified endpoint."
                    />
                </>
            )
        }
        case BlockExplorerValidation.KNOWN_EXPLORER: {
            return withWrapper(
                <>
                    <CheckmarkCircle classes="w-4 h-4 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="Verified explorer."
                    />
                </>
            )
        }
        case BlockExplorerValidation.UNKNOWN_EXPLORER: {
            return withWrapper(
                <>
                    <AiOutlineWarning
                        className={classnames(
                            "w-4 h-4 z-20",
                            "text-yellow-400"
                        )}
                    />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-full !border !border-gray-200 !w-56 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="This explorer is not recognized by BlockWallet."
                    />
                </>
            )
        }
        case ChainIdValidation.KNOWN_CHAIN_ID: {
            return withWrapper(
                <>
                    <CheckmarkCircle classes="w-4 h-4 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-3/4 !border !border-gray-200 !w-40 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="Verified network."
                    />
                </>
            )
        }
        case ChainIdValidation.UNKNOWN_CHAIN_ID: {
            return withWrapper(
                <>
                    <CgDanger className="w-4 h-4 text-red-700 z-20" />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-full !border !border-gray-200 !w-56 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="This network is not recognized by BlockWallet. Please make sure that this configuration will not compromise your funds."
                    />
                </>
            )
        }
        case IconURLValidation.CUSTOM_ICON: {
            return withWrapper(
                <>
                    <AiOutlineWarning
                        className={classnames(
                            "w-4 h-4 z-20",
                            "text-yellow-400"
                        )}
                    />
                    <Tooltip
                        className={classnames(
                            "!-translate-x-full !border !border-gray-200 !w-56 !break-word !whitespace-normal",
                            toolTipClassName
                        )}
                        content="Your IP address will be exposed to this domain if you choose to save the image URL"
                    />
                </>
            )
        }
    }

    return null
}

export default RPCValidationEndLabelInfo
