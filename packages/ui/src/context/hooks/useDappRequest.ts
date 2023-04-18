import { useBlankState } from "../background/backgroundHooks"

// Type of dapp request
export enum DappReq {
    ASSET = "ASSET",
    SIGNING = "SIGNING",
    SWITCH_NETWORK = "SWITCH_NETWORK",
    ADD_ETHEREUM_CHAIN = "ADD_ETHEREUM_CHAIN",
}

// Dapp request optional status type

export enum DappRequestSigningStatus {
    PENDING = "DAPP_PENDING",
    APPROVED = "DAPP_APPROVED",
    REJECTED = "DAPP_REJECTED",
    FAILED = "DAPP_FAILED",
    SIGNED = "DAPP_SIGNED",
}

export const useDappRequest = () => {
    const { dappRequests } = useBlankState()!

    // If no requests left, return undefined
    if (
        typeof dappRequests === "undefined" ||
        (typeof dappRequests === "object" &&
            Object.keys(dappRequests).length === 0)
    ) {
        return undefined
    }

    // Get the object entries ordered by submission time
    const requests = Object.entries(dappRequests).sort(
        ([_id, { time: timeA }], [_id2, { time: timeB }]) => timeA - timeB
    )

    // Get first dApp request (origin, site data and parameters)
    const [
        requestId,
        {
            origin,
            siteMetadata,
            params: dappReqData,
            type,
            status,
            error,
            approveTime,
            qrParams,
        },
    ] = requests[0]

    // Get requests count
    const requestCount = requests.length

    return {
        dappReqData,
        requestCount,
        requestId,
        origin,
        siteMetadata,
        approveTime,
        status,
        error,
        type,
        qrParams,
    }
}
