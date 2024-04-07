import classnames from "classnames"
import { FunctionComponent, useEffect, useState } from "react"

import {
    useOnMountHistory,
    useOnMountLastLocation,
} from "../../context/hooks/useOnMount"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import NetworkDisplayBadge from "../chain/NetworkDisplayBadge"

import AppIcon from "../icons/AppIcon"

import CloseIcon from "../icons/CloseIcon"
import ArrowIcon from "../icons/ArrowIcon"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownMenuItem } from "../ui/Dropdown/DropdownMenu"
import useHotKey, { UseHotKeyProps } from "../../util/hooks/useHotKey"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../label/Tooltip"

export interface PopupHeaderProps {
    title: string
    backButton?: boolean
    keepState?: boolean // if true, keeps the previous state while going back using the back button
    networkIndicator?: boolean
    tooltip?: { link: string; content: React.ReactElement } // if defined, a more info icon will be displayed on the right of the title with the content displayed on hover
    close?: string | boolean
    icon?: string | null
    disabled?: boolean // used to disable back or close buttons
    onClose?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
    onBack?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void // in case we want to replace default back behavior
    actions?: React.ReactNode[]
    children?: React.ReactNode | undefined
    className?: string
    goBackState?: object
    permissions?: { [action: string]: boolean } //used to validate hotkeys actions
}

const PopupHeader: FunctionComponent<PopupHeaderProps> = ({
    title,
    backButton = true,
    keepState = false,
    networkIndicator = false,
    tooltip = undefined,
    close = "/home",
    icon,
    children,
    disabled = false,
    onClose,
    onBack,
    actions,
    className,
    goBackState,
    permissions,
}) => {
    const history = useOnMountHistory()
    const lastLocation = useOnMountLastLocation()
    const network = useSelectedNetwork()
    const [fromAction, setFromAction] = useState(false)
    const [mounted, setMounted] = useState(false)

    const onBackAction = (e: any) => {
        if (onBack) return onBack(e)

        //means there is no stack at all and we don't were to go
        //as the history hasn't been restored.
        //Also, we don't have the lastLocation as the extension may have been closed
        //and restored using the localStorage (useLocationRecovery).
        //Therefore, we return to home.
        if (history.length <= 1) {
            return history.replace("/")
        }

        if (keepState || goBackState) {
            let newState = {}
            if (keepState) {
                newState = lastLocation?.state
                    ? (lastLocation?.state as any & {
                          keepState: true
                      })
                    : {}
            }
            if (goBackState) {
                newState = {
                    ...newState,
                    ...goBackState,
                }
            }
            return history.replace({
                pathname: lastLocation?.pathname,
                state: newState,
            })
        }
        fromAction ? history.go(-3) : history.goBack()
    }

    const onCloseAction = (e: any) => {
        if (onClose) return onClose(e as any)

        history.push(typeof close === "string" ? close : "/home")
    }

    useEffect(() => {
        setFromAction(history.location.state?.fromAction)
        setMounted(true)

        return () => setMounted(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useHotKey({
        onClose: close && onCloseAction,
        onBack: backButton && onBackAction,
        permissions: permissions,
    } as UseHotKeyProps)

    return (
        <div
            className={classnames(
                "z-10 flex flex-row items-center px-6 py-4 bg-white bg-opacity-95 max-w-full",
                className
            )}
            style={{ minHeight: "69px" }}
        >
            {backButton && (
                <button
                    type="button"
                    onClick={onBackAction}
                    disabled={disabled || !mounted}
                    className={classnames(
                        "p-2 -ml-2 mr-1 cursor-pointer transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default",
                        disabled && "pointer-events-none text-gray-300"
                    )}
                >
                    <ArrowIcon />
                </button>
            )}
            {icon && (
                <div className="pr-3">
                    <AppIcon iconURL={icon} size={10} />
                </div>
            )}
            {title && (
                <span
                    title={title}
                    className={classnames(
                        "text-base font-semibold",
                        icon && "w-56"
                    )}
                >
                    {title}
                </span>
            )}
            {tooltip && (
                <div className="group relative">
                    <a href={tooltip.link} target="_blank" rel="noreferrer">
                        <AiFillInfoCircle
                            size={26}
                            className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                        />
                        <Tooltip
                            content={tooltip.content}
                            className="-mb-4 translate-y-[90%] -translate-x-[39%]"
                        />
                    </a>
                </div>
            )}
            {(networkIndicator || actions || close) && (
                <div className="ml-auto flex space-x-1">
                    {networkIndicator && (
                        <NetworkDisplayBadge network={network} />
                    )}
                    {actions && (
                        <Dropdown>
                            <Dropdown.Menu id="popup-actions">
                                {actions.map((action, idx) => {
                                    return (
                                        <DropdownMenuItem key={idx}>
                                            {action}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </Dropdown.Menu>
                        </Dropdown>
                    )}

                    {close && (
                        <button
                            onClick={onCloseAction}
                            disabled={disabled}
                            className={classnames(
                                "p-2 -mr-2 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default",
                                disabled && "pointer-events-none text-gray-300"
                            )}
                            type="button"
                        >
                            <CloseIcon />
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}

export default PopupHeader
