import classnames from "classnames"
import { FunctionComponent, useEffect, useState } from "react"

import {
    useOnMountHistory,
    useOnMountLastLocation,
} from "../../context/hooks/useOnMount"
import AppIcon from "../icons/AppIcon"

import CloseIcon from "../icons/CloseIcon"
import ArrowIcon from "../icons/ArrowIcon"
import Dropdown from "../ui/Dropdown/Dropdown"
import { DropdownMenuItem } from "../ui/Dropdown/DropdownMenu"

export interface PopupHeaderProps {
    title: string
    backButton?: boolean
    keepState?: boolean // if true, keeps the previous state while going back using the back button
    close?: string | boolean
    icon?: string | null
    disabled?: boolean // used to disable back or close buttons
    onClose?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
    onBack?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void // in case we want to replace default back behavior
    actions?: React.ReactNode[]
    children?: React.ReactNode | undefined
    className?: string
    goBackState?: object
}

const PopupHeader: FunctionComponent<PopupHeaderProps> = ({
    title,
    backButton = true,
    keepState = false,
    close = "/home",
    icon,
    children,
    disabled = false,
    onClose,
    onBack,
    actions,
    className,
    goBackState,
}) => {
    const history = useOnMountHistory()
    const lastLocation = useOnMountLastLocation()
    const [fromAction, setFromAction] = useState(false)

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setFromAction(history.location.state?.fromAction)
        setMounted(true)

        return () => setMounted(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            className={classnames(
                "z-10 flex flex-row items-center p-6 bg-white bg-opacity-75 max-w-full",
                className
            )}
            style={{ backdropFilter: "blur(4px)", minHeight: "76px" }}
        >
            {backButton && (
                <button
                    type="button"
                    onClick={(e) => {
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
                    }}
                    disabled={disabled || !mounted}
                    className={classnames(
                        "p-2 -ml-2 mr-1 cursor-pointer transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300",
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
            <span
                title={title}
                className={classnames("text-base font-bold", icon && "w-56")}
            >
                {title}
            </span>
            {actions && (
                <div className="ml-auto">
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
                </div>
            )}
            {children}
            {close && (
                <button
                    onClick={(e) => {
                        if (onClose) return onClose(e)
                        history.push(
                            typeof close === "string" ? close : "/home"
                        )
                    }}
                    disabled={disabled}
                    className={classnames(
                        "p-2 ml-auto -mr-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300",
                        disabled && "pointer-events-none text-gray-300"
                    )}
                    type="button"
                >
                    <CloseIcon />
                </button>
            )}
        </div>
    )
}

export default PopupHeader
