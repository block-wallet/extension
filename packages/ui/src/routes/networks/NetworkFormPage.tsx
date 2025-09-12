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
import { AiOutlineWarning, AiOutlineInfoCircle } from "react-icons/ai"
import { HiOutlineExternalLink } from "react-icons/hi"
import usePersistedLocalStorageForm from "../../util/hooks/usePersistedLocalStorageForm"
import { showBasicNotification } from "../../context/util/platform"

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

const SecurityWarning = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => (
    <div className="mb-6">
        <div
            className={`
                rounded-xl border transition-all duration-200 ease-in-out cursor-pointer
                ${isCollapsed
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                }
            `}
            onClick={onToggle}
        >
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        <AiOutlineWarning className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Security Notice
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Custom networks are not verified by BlockWallet
                        </p>
                    </div>
                </div>
                <div className={`transform transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {!isCollapsed && (
                <div className="px-4 pb-4 border-t border-amber-200 dark:border-amber-800/50 mt-4 pt-4">
                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                        <p>
                            BlockWallet does not verify custom networks. Please ensure you understand{" "}
                            <a
                                className="underline font-medium hover:no-underline text-amber-900 dark:text-amber-100"
                                href={LINKS.ARTICLES.CUSTOM_NETWORK_RISKS}
                                target="_blank"
                                rel="noreferrer"
                            >
                                the potential risks
                            </a>{" "}
                            that adding a custom network may pose.
                        </p>
                        <div className="flex items-start space-x-2 mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <AiOutlineWarning className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-800 dark:text-amber-200">
                                <strong>Important:</strong> Only add networks from trusted sources. Malicious networks can steal your funds or compromise your privacy.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
)

const FormField = ({
    children,
    label,
    required = false,
    error,
    warning,
    info
}: {
    children: React.ReactNode
    label: string
    required?: boolean
    error?: string
    warning?: string
    info?: string
}) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        {error && (
            <div className="flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
        )}
        {warning && !error && (
            <div className="flex items-start space-x-2 text-amber-600 dark:text-amber-400 text-xs">
                <AiOutlineWarning className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
            </div>
        )}
        {info && !error && !warning && (
            <div className="flex items-start space-x-2 text-blue-600 dark:text-blue-400 text-xs">
                <AiOutlineInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{info}</span>
            </div>
        )}
    </div>
)

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
    const [isWarningCollapsed, setIsWarningCollapsed] = useState<boolean>(true)
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

                if (!watchRPCUrl || !watchChainId) {
                    setRpcValidationStatus(RPCUrlValidation.EMPTY)
                    return
                }

                if (errors.rpcUrl !== undefined || !validateUrl(watchRPCUrl)) {
                    setRpcValidationStatus(RPCUrlValidation.INVALID_URL)
                    return
                }
                try {
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
                    setRpcValidationStatus(RPCUrlValidation.INVALID_ENDPOINT)
                }
            } finally {
                setIsValidating(false)
            }
        }
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
                                    className="text-red-500 dark:text-red-400 cursor-pointer flex flex-row items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg w-40 transition-colors duration-150"
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
                            label={isEdit ? "Save Changes" : "Add Network"}
                            type="submit"
                            disabled={!canSubmitForm}
                            onClick={onSave}
                            buttonClass="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-150"
                        />
                    </PopupFooter>
                ) : null
            }
        >
            <div className="bg-white dark:bg-gray-900 min-h-full">
                {!isNativelySupported && (
                    <SecurityWarning
                        isCollapsed={isWarningCollapsed}
                        onToggle={() => setIsWarningCollapsed(!isWarningCollapsed)}
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
                        loading: isEdit ? "Saving Changes..." : "Adding Network...",
                        error: "Error",
                        success: "Success",
                    }}
                    texts={{
                        loading: isEdit
                            ? "Updating network configuration"
                            : "Adding new network to your wallet",
                        error:
                            addNetworkInvoke.error?.message ||
                            "Something went wrong while saving the network",
                        success: isEdit ? "Network updated successfully" : "Network added successfully",
                    }}
                    timeout={1500}
                    onDone={() => {
                        if (addNetworkInvoke.isError) {
                            return addNetworkInvoke.reset()
                        }

                        if (addNetworkInvoke.isSuccess) {
                            showBasicNotification(
                                isEdit ? 'Network updated' : 'Network added',
                                isEdit ? 'Network updated successfully' : 'Network added successfully'
                            )
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
                        loading: "Removing network from your wallet",
                        error:
                            removeNetworkInvoke.error?.message ||
                            "Something went wrong while deleting the network",
                        success: "Network deleted successfully",
                    }}
                    timeout={1500}
                    onDone={() => {
                        if (removeNetworkInvoke.isError) {
                            return removeNetworkInvoke.reset()
                        }

                        if (removeNetworkInvoke.isSuccess) {
                            showBasicNotification('Network deleted', 'Network deleted successfully')
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

                <div className="flex flex-col w-full justify-between flex-1 h-full">
                    <div className="flex flex-col flex-1 p-6 space-y-6">
                        <FormField
                            label="Network Name"
                            required
                            error={
                                networkNameInUseError
                                    ? "This name is already in use."
                                    : errors.name?.message
                            }
                        >
                            <TextInput
                                appearance="outline"
                                {...register("name")}
                                placeholder="e.g., Ethereum Mainnet"
                                autoFocus={true}
                                maxLength={40}
                                defaultValue={network?.name}
                                readOnly={
                                    editMode === "disabled" ||
                                    editingSelectedNetwork
                                }
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-150"
                            />
                        </FormField>

                        <FormField
                            label="RPC URL"
                            required
                            error={errors.rpcUrl?.message}
                        >
                            <div className="space-y-3">
                                <TextInput
                                    appearance="outline"
                                    {...register("rpcUrl")}
                                    placeholder="https://..."
                                    defaultValue={network?.rpcUrl}
                                    readOnly={
                                        editMode === "disabled" ||
                                        editingSelectedNetwork
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-150"
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
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-150"
                                            onClick={() => {
                                                setValue("rpcUrl", defaultRpcUrl)
                                            }}
                                        >
                                            Reset to default RPC
                                        </button>
                                    </div>
                                )}
                            </div>
                        </FormField>

                        <FormField
                            label="Chain ID"
                            required
                            error={errors.chainId?.message}
                            info="Used for signing transactions. Must match the chain ID from the RPC endpoint."
                        >
                            <div className="relative">
                                <TextInput
                                    appearance="outline"
                                    {...register("chainId")}
                                    placeholder="e.g., 1 or 0x1"
                                    defaultValue={network?.chainId}
                                    readOnly={editMode !== "all"}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-150"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    onClick={() => {
                                        window.open(
                                            LINKS.ARTICLES.CUSTOM_NETWORK_RISKS,
                                            "_blank"
                                        )
                                    }}
                                >
                                    <HiOutlineExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </FormField>

                        <FormField
                            label="Currency Symbol"
                            required
                            error={errors.symbol?.message}
                            warning={
                                invalidCurrencySymbolWarn
                                    ? `Chain ${watchChainId} typically uses ${chainDetailsRef.current?.nativeCurrency.symbol} as currency symbol.`
                                    : undefined
                            }
                        >
                            <TextInput
                                appearance="outline"
                                {...register("symbol")}
                                placeholder="e.g., ETH"
                                defaultValue={network?.symbol}
                                readOnly={editMode !== "all"}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-150"
                            />
                        </FormField>

                        <FormField
                            label="Block Explorer URL"
                            error={errors.blockExplorerUrl?.message}
                            info="Optional. Used to view transactions and addresses."
                        >
                            <TextInput
                                appearance="outline"
                                {...register("blockExplorerUrl")}
                                placeholder="https://etherscan.io (optional)"
                                defaultValue={network?.blockExplorerUrl}
                                readOnly={
                                    editMode === "disabled" || editingSelectedNetwork
                                }
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-150"
                            />
                        </FormField>

                        <div className="space-y-2">
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
                            <p className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                                Mark this as a testnet if it's used for testing purposes
                            </p>
                        </div>

                        {networkAlreadyExistError && (
                            <Alert type="error">
                                <div className="flex items-start space-x-2">
                                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <span className="font-semibold">Network already exists</span>
                                        <p className="text-sm mt-1">
                                            This network is already in your wallet. Try editing the existing network instead.
                                        </p>
                                    </div>
                                </div>
                            </Alert>
                        )}

                        {editingSelectedNetwork && (
                            <Alert type="warn">
                                <div className="flex items-start space-x-2">
                                    <AiOutlineWarning className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-semibold">Cannot edit active network</span>
                                        <p className="text-sm mt-1">
                                            You cannot edit this network while it's currently selected. Switch to another network first.
                                        </p>
                                    </div>
                                </div>
                            </Alert>
                        )}
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default NetworkFormPage
