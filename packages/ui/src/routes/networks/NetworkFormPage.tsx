import { yupResolver } from "@hookform/resolvers/yup"
import { useEffect, useState, useRef } from "react"
import { useWatch } from "react-hook-form"
import * as yup from "yup"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import TextInput from "../../components/input/TextInput"
import PopupFooter from "../../components/popup/PopupFooter"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import {
    addNetwork,
    editNetwork,
    getRpcChainId,
    getDefaultRpc,
    getSpecificChainDetails,
    removeNetwork,
    changeNetwork,
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
import ConfirmDialog, {
    ConfirmDialogState,
} from "../../components/dialog/ConfirmDialog"
import { ChainListItem } from "@block-wallet/background/utils/chainlist"
import { parseChainId } from "../../util/networkUtils"
import CollapsableMessage from "../../components/CollapsableMessage"
import { AiOutlineWarning } from "react-icons/ai"
import usePersistedLocalStorageForm from "../../util/hooks/usePersistedLocalStorageForm"

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

const validateUrl = (url: string) => {
    try {
        new URL(url)
        return (
            url.toLowerCase().startsWith("http://") ||
            url.toLowerCase().startsWith("https://")
        )
    } catch {
        return false
    }
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
        .trim()
        .test("is-empty", "Network name is empty.", (s) => {
            return !!s && s.trim().length > 0
        })
        .max(40, "Network name is too long")
        .required(),
    rpcUrl: yup
        .string()
        .test(
            "match url shape",
            "Invalid URL. Make sure that you are using http/s protocol.",
            (url) => {
                return url === undefined ? false : validateUrl(url)
            }
        )
        .trim()
        .required(),
    chainId: yup
        .string()
        .test("is-empty", "Chain Id is empty", (s) => {
            return !!s
        })
        .test("numeric", "Chain ID must be numeric", (s) => {
            return !Number.isNaN(Number(s))
        })
        .required(),
    symbol: yup.string().required("Currency Symbol is empty"),
    blockExplorerUrl: yup
        .string()
        .test(
            "match url shape",
            "Invalid URL. Make sure that you are using http/s protocol.",
            (url) => {
                return !url || validateUrl(url)
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
    const [rpcValidationStatus, setRpcValidationStatus] =
        useState<RPCUrlValidation>(RPCUrlValidation.EMPTY)
    const [rpcChainId, setRpcChainId] = useState<number>(0)
    const [isNativelySupported, setIsNativelySupported] =
        useState<boolean>(false)
    const {
        availableNetworks,
        providerStatus: { isCurrentProviderOnline },
    } = useBlankState()!

    const [defaultRpcUrl, setDefaultRpcUrl] = useState<string | undefined>(
        undefined
    )

    const [confirmationDialog, setConfirmationDialog] =
        useState<ConfirmDialogState>({ open: false })

    const [switchToNetwork, setSwitchToNetwork] = useState<boolean>(false)

    useEffect(() => {
        if (!network?.chainId) return
        getDefaultRpc(network?.chainId).then((defaultRpc) => {
            setDefaultRpcUrl(defaultRpc)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    const isUsingDefaultRPC = !!defaultRpcUrl && watchRPCUrl === defaultRpcUrl

    useEffect(() => {
        let ref: NodeJS.Timeout | null = null
        if (!!watchRPCUrl && !!watchChainId) {
            setIsValidating(true)
        }
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

                if (errors.rpcUrl !== undefined || !validateUrl(watchRPCUrl)) {
                    setRpcValidationStatus(RPCUrlValidation.INVALID_URL)
                    return
                }
                try {
                    //Unknown chain id, validation cannot be done.
                    if (!chainDetailsRef.current) {
                        setRpcValidationStatus(
                            RPCUrlValidation.EMPTY_UNKNOWN_CHAIN
                        )
                        return
                    }

                    const chainId = await getRpcChainId(watchRPCUrl)
                    setRpcChainId(chainId)
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
                    setRpcValidationStatus(RPCUrlValidation.INVALID_ENDPOINT)
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchChainId, watchRPCUrl, setIsValidating])

    const onSave = handleSubmit(async (data: networkFormData) => {
        const networkData = {
            blockExplorerUrl: data.blockExplorerUrl || "",
            chainId: parseChainId(data.chainId)!.toString(),
            currencySymbol: data.symbol,
            name: data.name!,
            rpcUrl: data.rpcUrl,
            test: !!data.test,
            switchToNetwork: false,
        }

        if (!isEdit) {
            setConfirmationDialog({
                title: "Switch Network",
                message: `Do you want to switch to ${networkData.name} network?`,
                open: true,
                confirmText: "Yes",
                cancelText: "No",
                onConfirm: async () => {
                    networkData.switchToNetwork = true
                    setSwitchToNetwork(true)
                },
                onClose: () => {
                    setConfirmationDialog({ open: false })
                    addNetworkInvoke.run(addNetwork(networkData))
                },
            })
        } else {
            addNetworkInvoke.run(
                editNetwork({
                    chainId: parseChainId(data.chainId)!.toString(),
                    updates: {
                        rpcUrl: data.rpcUrl,
                        blockExplorerUrl: data.blockExplorerUrl,
                        name: data.name!,
                        test: !!data.test,
                    },
                })
            )
        }
    })
    useEffect(() => {
        const existingNetwork = Object.values(availableNetworks).find(
            (network) => network.chainId === Number(watchChainId)
        )
        setIsNativelySupported(
            existingNetwork ? existingNetwork.nativelySupported : false
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    //Do not allow to edit the selected network unless the provider is down.
    const editingSelectedNetwork =
        isEdit &&
        selectedChainId === Number(watchChainId) &&
        isCurrentProviderOnline

    const canSubmitForm =
        Object.keys(errors).length === 0 &&
        rpcEndpointIsValid &&
        !networkAlreadyExistError &&
        !networkNameInUseError &&
        !editingSelectedNetwork &&
        !!watchName &&
        !!watchCurrencySymbol

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
                                          setConfirmationDialog({
                                              title: "Delete Network",
                                              message: `Are you sure you want to delete ${network?.name}?`,
                                              open: true,
                                              onConfirm: () => {
                                                  deleteNetwork()
                                              },
                                          })
                                      }}
                                      className={
                                          "text-red-500 cursor-pointer flex flex-row items-center p-2 hover:bg-gray-100 rounded-md w-40"
                                      }
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
                <CollapsableMessage
                    dialog={{
                        title: "Warning",
                        message: (
                            <span>
                                BlockWallet does not verify custom networks.
                                Make sure you understand{" "}
                                <a
                                    className="underline text-primary-blue-default hover:text-primary-blue-hover"
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
                        <div className="text-center  bg-yellow-200 hover:bg-yellow-100 opacity-90  w-full p-2 space-x-2 flex tems-center font-semibold justify-center">
                            <AiOutlineWarning className="w-4 h-4 yellow-300" />
                            <span className="text-xs text-yellow-900">
                                <span className="font-semibold">
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

                    history.push(
                        isEdit || !switchToNetwork ? "/settings/networks" : "/"
                    )
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
                showCloseButton
            />
            <ConfirmDialog
                title={confirmationDialog.title!}
                message={confirmationDialog.message!}
                open={confirmationDialog.open}
                confirmText={confirmationDialog.confirmText}
                cancelText={confirmationDialog.cancelText}
                onClose={
                    confirmationDialog.onClose ??
                    (() => setConfirmationDialog({ open: false }))
                }
                onConfirm={confirmationDialog.onConfirm!}
            />
            <div className="flex flex-col w-full justify-between flex-1 h-full !-mt-3">
                <div className="flex flex-col flex-1 p-6 space-y-3">
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
                    <div>
                        <TextInput
                            appearance="outline"
                            label="RPC URL"
                            {...register("rpcUrl")}
                            placeholder="https://..."
                            error={errors.rpcUrl?.message}
                            autoFocus={true}
                            defaultValue={network?.rpcUrl}
                            readOnly={
                                editMode === "disabled" ||
                                editingSelectedNetwork
                            }
                            endLabel={
                                <RPCValidationEndLabelInfo
                                    currentChainId={watchChainId}
                                    rpcChainId={rpcChainId}
                                    isValidating={isValidating}
                                    rpcValidation={rpcValidationStatus}
                                />
                            }
                        />
                        {defaultRpcUrl && !isUsingDefaultRPC && (
                            <div className="flex flex-col items-end mt-2 -mb-4">
                                <span
                                    className="text-xs font-semibold text-primary-blue-default cursor-pointer hover:underline"
                                    onClick={() => {
                                        setValue("rpcUrl", defaultRpcUrl)
                                    }}
                                >
                                    Revert to default RPC
                                </span>
                            </div>
                        )}
                    </div>

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
                                <span className="font-semibold">0x</span>{" "}
                                prefixed hexadecimal number.
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
                        readOnly={isNativelySupported}
                        disabled={isNativelySupported}
                    />
                    {networkAlreadyExistError && (
                        <Alert type="error">
                            <span className="font-semibold">Error: </span>
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
