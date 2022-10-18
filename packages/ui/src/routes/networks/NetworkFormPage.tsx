import { yupResolver } from "@hookform/resolvers/yup"
import { useEffect, useState, useRef } from "react"
import { useWatch } from "react-hook-form"
import * as yup from "yup"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import TextInput from "../../components/input/TextInput"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import classnames from "classnames"
import {
    addNetwork,
    editNetwork,
    getRpcChainId,
    getSpecificChainDetails,
    removeNetwork,
} from "../../context/commActions"
import WaitingDialog from "../../components/dialog/WaitingDialog"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"
import { useHistory } from "react-router-dom"
import ToggleButton from "../../components/button/ToggleButton"
import RPCValidationEndLabelInfo, {
    RPCUrlValidation,
} from "../../components/chain/RPCValidationEndLabelInfo"
import { useMemo } from "react"
import { useBlankState } from "../../context/background/backgroundHooks"
import { LINKS } from "../../util/constants"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import Alert from "../../components/ui/Alert"
import Icon, { IconName } from "../../components/ui/Icon"
import ConfirmDialog from "../../components/dialog/ConfirmDialog"
import { ChainListItem } from "@block-wallet/background/utils/chainlist"
import { parseChainId } from "../../util/networkUtils"
import CollapsableWarning from "../../components/CollapsableWarning"
import { AiOutlineWarning } from "react-icons/ai"
import usePersistedLocalStorageForm from "../../util/hooks/usePersistedLocalStorageForm"

const URLRegExp = new RegExp(
    "^(https:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
    "i"
)

const getStatusFromEnpoint = (
    chainInfo: ChainListItem,
    configuredUrl: string
) => {
    return chainInfo.rpc.some(
        (rpcUrl: string) =>
            rpcUrl?.toLowerCase().trim() === configuredUrl?.toLowerCase().trim()
    )
        ? RPCUrlValidation.VERIFIED_ENDPOINT
        : RPCUrlValidation.UNVERIFIED_ENDPOINT
}

interface NetworkInputs {
    name?: string
    rpcUrl?: string
    chainId?: number
    symbol?: string
    blockExplorerUrl?: string
    isTestnet?: boolean
    nativelySupported?: boolean
}

interface Props {
    editMode: "disabled" | "minimal" | "all"
    isEdit: boolean
    canDelete?: boolean
    network?: NetworkInputs
    title: string
}

// new contact schema
const networkSchema = yup.object({
    name: yup
        .string()
        .test("is-empty", "Network name is empty.", (s) => {
            return !!s && s.trim().length > 0
        })
        .max(40, "Network name is too long"),
    rpcUrl: yup
        .string()
        .matches(
            URLRegExp,
            "Invalid URL. Make sure that you are using https protocol."
        )
        .required("RPC URL is empty."),
    chainId: yup
        .string()
        .test("is-empty", "Chain Id is empty", (s) => {
            return !!s
        })
        .test("numeric", "Chain ID must be numeric", (s) => {
            return !Number.isNaN(Number(s))
        }),
    symbol: yup.string().required("Currency Symbol is empty"),
    blockExplorerUrl: yup
        .string()
        .test(
            "match url shape",
            "Invalid URL. Make sure that you are using https protocol.",
            (value) => {
                return !value || !!URLRegExp.test(value)
            }
        ),
    test: yup.boolean(),
})
type networkFormData = yup.InferType<typeof networkSchema>

const NetworkFormPage = ({
    editMode,
    canDelete,
    network,
    title,
    isEdit,
}: Props) => {
    const { chainId: selectedChainId } = useSelectedNetwork()
    const history = useHistory()
    const chainDetailsRef = useRef<ChainListItem | null>(null)
    const addNetworkInvoke = useAsyncInvoke()
    const removeNetworkInvoke = useAsyncInvoke()
    const [isValidating, setIsValidating] = useState<boolean>(false)
    const [confirmDeletion, setConfirmDeletion] = useState<boolean>(false)
    const [rpcValidationStatus, setRpcValidationStatus] =
        useState<RPCUrlValidation>(() => {
            if (network) {
                return RPCUrlValidation.VERIFIED_ENDPOINT
            }
            return RPCUrlValidation.EMPTY
        })
    const [isNativelySupported, setIsNativelySupported] =
        useState<boolean>(false)
    const { availableNetworks } = useBlankState()!

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        control,
    } = usePersistedLocalStorageForm<networkFormData>(
        { key: "networks.form" },
        {
            resolver: yupResolver(networkSchema),
            defaultValues: {
                name: network?.name,
                blockExplorerUrl: network?.blockExplorerUrl,
                chainId: network?.chainId || undefined,
                rpcUrl: network?.rpcUrl,
                symbol: network?.symbol,
                test: !!network?.isTestnet,
            } as Partial<networkFormData>,
        }
    )

    const watchedFields = useWatch({ control })

    const {
        name: watchName,
        chainId: watchChainId,
        rpcUrl: watchRPCUrl,
        symbol: watchCurrencySymbol,
    } = watchedFields

    useEffect(() => {
        let ref: NodeJS.Timeout | null = null
        setIsValidating(true)
        const derivateRPCStatusFromWatchers = async () => {
            try {
                const parsedChainId = parseChainId(watchChainId)
                //if there is a value in the chain Id, try to fetch the network details
                if (parsedChainId) {
                    if (
                        !chainDetailsRef.current ||
                        Number(chainDetailsRef.current?.chainId) !==
                            parsedChainId
                    ) {
                        chainDetailsRef.current = await getSpecificChainDetails(
                            parsedChainId
                        )
                    }
                } else {
                    chainDetailsRef.current = null
                }

                //if the rpcUrl or the chainId is empty, do not put an error message.
                if (!watchRPCUrl || !watchChainId) {
                    setRpcValidationStatus(RPCUrlValidation.EMPTY)
                    return
                }

                try {
                    const chainId = await getRpcChainId(watchRPCUrl)

                    //Unknown chain id, validation cannot be done.
                    if (!chainDetailsRef.current) {
                        setRpcValidationStatus(
                            RPCUrlValidation.EMPTY_UNKNOWN_CHAIN
                        )
                        return
                    }

                    setRpcValidationStatus(
                        Number(chainId) === parsedChainId
                            ? getStatusFromEnpoint(
                                  chainDetailsRef.current,
                                  watchRPCUrl
                              )
                            : RPCUrlValidation.CHAIN_ID_DOESNT_MATCH
                    )
                } catch (e) {
                    //Invalid URL if we were not able to fetch the chainId using the rpcUrl.
                    console.log(watchRPCUrl)
                    console.log(e)
                    setRpcValidationStatus(RPCUrlValidation.INVALID_URL)
                }
            } finally {
                setIsValidating(false)
            }
        }
        //debounce the state watchers
        ref = setTimeout(derivateRPCStatusFromWatchers, 300)
        return () => {
            ref && clearTimeout(ref!)
        }
    }, [watchChainId, watchRPCUrl, setIsValidating])

    const onSave = handleSubmit(async (data: networkFormData) => {
        const networkData = {
            blockExplorerUrl: data.blockExplorerUrl || "",
            chainId: parseChainId(data.chainId)!.toString(),
            currencySymbol: data.symbol,
            name: data.name!,
            rpcUrl: data.rpcUrl,
            test: !!data.test,
        }
        addNetworkInvoke.run(
            isEdit
                ? editNetwork({
                      chainId: parseChainId(data.chainId)!.toString(),
                      updates: {
                          rpcUrl: data.rpcUrl,
                          blockExplorerUrl: data.blockExplorerUrl,
                          name: data.name!,
                      },
                  })
                : addNetwork(networkData)
        )
    })
    useEffect(() => {
        const existingNetwork = Object.values(availableNetworks).find(
            (network) => network.chainId === Number(watchChainId)
        )
        setIsNativelySupported(
            existingNetwork ? existingNetwork.nativelySupported : false
        )
    }, [watchChainId])
    const deleteNetwork = () => {
        removeNetworkInvoke.run(removeNetwork(network!.chainId!))
    }

    const rpcEndpointIsValid = [
        RPCUrlValidation.UNVERIFIED_ENDPOINT,
        RPCUrlValidation.VERIFIED_ENDPOINT,
        RPCUrlValidation.EMPTY_UNKNOWN_CHAIN,
    ].includes(rpcValidationStatus)

    const invalidCurrencySymbolWarn =
        chainDetailsRef.current && watchCurrencySymbol
            ? chainDetailsRef.current.nativeCurrency.symbol !==
              watchCurrencySymbol
            : false

    const networkAlreadyExistError = useMemo(() => {
        if (!isEdit && watchChainId) {
            const existingNetwork = Object.values(availableNetworks).find(
                (network) => network.chainId === Number(watchChainId)
            )
            return existingNetwork && existingNetwork.enable
        }
        return false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchChainId, isEdit])

    const networkNameInUseError = useMemo(() => {
        return (
            watchName &&
            Object.values(availableNetworks)
                .filter((net) => net.chainId !== Number(watchChainId))
                .some((net) => {
                    return net.desc === (watchName || "").trim()
                })
        )
    }, [availableNetworks, watchChainId, watchName])

    const editingSelectedNetwork =
        isEdit && selectedChainId === Number(watchChainId)

    const canSubmitForm =
        Object.keys(errors).length === 0 &&
        rpcEndpointIsValid &&
        !networkAlreadyExistError &&
        !networkNameInUseError &&
        !editingSelectedNetwork

    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit: onSave,
                isFormValid: canSubmitForm,
            }}
            header={
                <PopupHeader
                    title={title}
                    close={false}
                    actions={
                        !editingSelectedNetwork && canDelete
                            ? [
                                  <div
                                      key={1}
                                      onClick={() => {
                                          setConfirmDeletion(true)
                                      }}
                                      className={classnames(
                                          "text-red-500 cursor-pointer flex flex-row items-center hover:bg-gray-100 rounded-b-md w-40"
                                      )}
                                  >
                                      <div className="pl-1 pr-1 w-8">
                                          <Icon
                                              name={IconName.TRASH_BIN}
                                              profile="danger"
                                          />
                                      </div>
                                      <span>Delete Network</span>
                                  </div>,
                              ]
                            : undefined
                    }
                />
            }
            footer={
                editMode !== "disabled" && !editingSelectedNetwork ? (
                    <PopupFooter>
                        <ButtonWithLoading
                            label="Save"
                            type="submit"
                            disabled={!canSubmitForm}
                            onClick={onSave}
                        />
                    </PopupFooter>
                ) : null
            }
        >
            {!isNativelySupported && (
                <CollapsableWarning
                    dialog={{
                        title: "Warning",
                        message: (
                            <span>
                                BlockWallet does not verify custom networks.
                                Make sure you understand{" "}
                                <a
                                    className="underline text-blue-600 hover:text-blue-800"
                                    href={LINKS.ARTICLES.CUSTOM_NETWORK_RISKS}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    the potential risks adding a custom network
                                    may pose
                                </a>
                                .
                            </span>
                        ),
                    }}
                    isCollapsedByDefault
                    collapsedMessage={
                        <div className="text-center  bg-yellow-200 hover:bg-yellow-100 opacity-90  w-full p-2 space-x-2 flex tems-center font-bold justify-center">
                            <AiOutlineWarning className="w-4 h-4 yellow-300" />
                            <span className="text-xs text-yellow-900">
                                <span className="font-bold">
                                    BlockWallet does not verify custom networks.
                                </span>
                            </span>
                        </div>
                    }
                />
            )}
            <WaitingDialog
                open={!addNetworkInvoke.isIdle}
                status={
                    addNetworkInvoke.isError
                        ? "error"
                        : addNetworkInvoke.isSuccess
                        ? "success"
                        : "loading"
                }
                titles={{
                    loading: isEdit ? "Editing..." : "Adding...",
                    error: "Error",
                    success: "Success",
                }}
                texts={{
                    loading: isEdit
                        ? "Editing network"
                        : "Adding a new network",
                    error:
                        addNetworkInvoke.error?.message ||
                        "Something went wrong while persisting the network",
                    success: isEdit ? "Network edited" : "Network added",
                }}
                timeout={1500}
                onDone={() => {
                    if (addNetworkInvoke.isError) {
                        return addNetworkInvoke.reset()
                    }
                    history.replace("/settings/networks")
                }}
            />
            <WaitingDialog
                open={!removeNetworkInvoke.isIdle}
                status={
                    removeNetworkInvoke.isError
                        ? "error"
                        : removeNetworkInvoke.isSuccess
                        ? "success"
                        : "loading"
                }
                titles={{
                    loading: "Deleting...",
                    error: "Error",
                    success: "Success",
                }}
                texts={{
                    loading: isEdit
                        ? "Editing network"
                        : "Adding a new network",
                    error:
                        removeNetworkInvoke.error?.message ||
                        "Something went wrong while deleting the network",
                    success: "Network deleted",
                }}
                timeout={1500}
                onDone={() => {
                    if (addNetworkInvoke.isError) {
                        return addNetworkInvoke.reset()
                    }
                    history.push("/settings/networks")
                }}
            />
            <ConfirmDialog
                title="Delete Network"
                message={`Are you sure you want to delete ${network?.name}?`}
                open={confirmDeletion}
                onClose={() => setConfirmDeletion(false)}
                onConfirm={() => {
                    deleteNetwork()
                    setConfirmDeletion(false)
                }}
            />
            <div className="flex flex-col w-full justify-between flex-1 h-full">
                <div className="flex flex-col flex-1 p-6 pt-4 space-y-3">
                    <div className="flex flex-col space-y-1">
                        <TextInput
                            appearance="outline"
                            label="Network Name"
                            {...register("name")}
                            placeholder="Ethereum Mainnet"
                            error={
                                networkNameInUseError
                                    ? "This name is already in use."
                                    : errors.name?.message
                            }
                            autoFocus={true}
                            maxLength={40}
                            defaultValue={network?.name}
                            readOnly={
                                editMode === "disabled" ||
                                editingSelectedNetwork
                            }
                        />
                    </div>
                    <TextInput
                        appearance="outline"
                        label="RPC URL"
                        {...register("rpcUrl")}
                        placeholder="https://..."
                        error={errors.rpcUrl?.message}
                        autoFocus={true}
                        defaultValue={network?.rpcUrl}
                        readOnly={
                            editMode === "disabled" || editingSelectedNetwork
                        }
                        endLabel={
                            <RPCValidationEndLabelInfo
                                currentChainId={watchChainId}
                                isValidating={isValidating}
                                rpcValidation={rpcValidationStatus}
                            />
                        }
                    />
                    <TextInput
                        appearance="outline"
                        label="Chain ID"
                        {...register("chainId")}
                        placeholder="Network Chain ID"
                        error={errors.chainId?.message}
                        autoFocus={true}
                        onClickInfo={() => {
                            window.open(
                                LINKS.ARTICLES.CUSTOM_NETWORK_RISKS,
                                "_blank"
                            )
                        }}
                        info={
                            <span className="p-1">
                                The chain ID is used for signing transactions
                                and it must match with the chain ID returned by
                                the RPC endpoint configured above. You can enter
                                a decimal or a{" "}
                                <span className="font-bold">0x</span> prefixed
                                hexadecimal number.
                            </span>
                        }
                        defaultValue={network?.chainId}
                        readOnly={editMode !== "all"}
                    />
                    <TextInput
                        appearance="outline"
                        label="Currency Symbol"
                        {...register("symbol")}
                        placeholder="ETH"
                        error={errors.symbol?.message}
                        warning={
                            invalidCurrencySymbolWarn
                                ? `Chain ${watchChainId} uses ${chainDetailsRef.current?.nativeCurrency.symbol} as currency symbol.`
                                : undefined
                        }
                        autoFocus={true}
                        defaultValue={network?.symbol}
                        readOnly={editMode !== "all"}
                    />
                    <TextInput
                        appearance="outline"
                        label="Block Explorer URL (Optional)"
                        {...register("blockExplorerUrl")}
                        placeholder="https://..."
                        error={errors.blockExplorerUrl?.message}
                        autoFocus={true}
                        defaultValue={network?.blockExplorerUrl}
                        readOnly={
                            editMode === "disabled" || editingSelectedNetwork
                        }
                    />
                    <ToggleButton
                        label="Testnet"
                        defaultChecked={!!network?.isTestnet}
                        inputName="test"
                        onToggle={(isChecked) => {
                            setValue("test", isChecked)
                        }}
                        readOnly={isEdit}
                    />
                    {networkAlreadyExistError && (
                        <Alert type="error">
                            <span className="font-bold">Error: </span>
                            <span className="font-medium">
                                The network you're trying to add already exists.
                                Try editing the existing network instead.
                            </span>
                        </Alert>
                    )}
                    {editingSelectedNetwork && (
                        <Alert type="warn">
                            <span className="font-medium">
                                You can't edit this network while it is
                                selected.
                            </span>
                        </Alert>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default NetworkFormPage
