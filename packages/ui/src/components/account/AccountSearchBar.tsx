import classnames from "classnames"
import { FunctionComponent, useEffect, useRef, useState } from "react"
import { ActionButton } from "../button/ActionButton"

// Assets
import accountAdd from "../../assets/images/icons/account_add.svg"

import CloseIcon from "../icons/CloseIcon"
import OutlinedButton from "../ui/OutlinedButton"
import Icon, { IconName } from "../ui/Icon"

const AccountSearchBar: FunctionComponent<{
    createAccountTo?: any
    onChange: (value: string) => void
    setIsSearching: (isSearching: boolean) => void
}> = ({
    createAccountTo = { pathname: "/accounts/create" },
    onChange,
    setIsSearching,
}) => {
    const [searchBarVisible, setSearchBarVisible] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        searchBarVisible && inputRef.current!.focus()
    }, [searchBarVisible])

    const onValueChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(e.target.value)
    }

    return (
        <div
            className={classnames(
                "flex justify-between w-full",
                !searchBarVisible && "space-x-2"
            )}
        >
            <div
                className={classnames(
                    "transition-opacity duration-75    ",
                    !searchBarVisible
                        ? "flex-1 delay-300 opacity-100"
                        : "w-0 opacity-0 "
                )}
            >
                {!searchBarVisible && (
                    <ActionButton
                        icon={accountAdd}
                        label="New Account"
                        to={createAccountTo.pathname}
                        state={createAccountTo.state}
                        className="!h-10"
                    />
                )}
            </div>
            <OutlinedButton
                className={classnames(
                    "transition-width",
                    searchBarVisible
                        ? "!w-full delay-150 duration-500"
                        : "duration-100 cursor-pointer"
                )}
                onClick={() => {
                    if (!searchBarVisible) {
                        setSearchBarVisible(true)
                        setIsSearching(true)
                    }
                }}
                title="Search account"
            >
                <Icon name={IconName.SEARCH} profile="default" size="lg" />
                <input
                    ref={inputRef}
                    className={classnames(
                        "bg-transparent p-0 pl-1 border-none w-10/12 font-normal text-sm",
                        "transition-opacity",
                        searchBarVisible
                            ? "opacity-100 duration-100 delay-500 flex-1"
                            : "opacity-0 !w-0 !m-0"
                    )}
                    placeholder="Search for Account"
                    onChange={onValueChanged}
                />
                <div
                    className={classnames(
                        "w-1/12 hover:text-primary-blue-default",
                        "transition-opacity",
                        searchBarVisible
                            ? "opacity-100 delay-500 duration-75"
                            : "opacity-0 duration-75 !w-0 !m-0 invisible"
                    )}
                    onClick={() => {
                        inputRef.current!.value = ""
                        setSearchBarVisible(false)
                        setIsSearching(false)
                    }}
                >
                    <CloseIcon size="12" />
                </div>
            </OutlinedButton>
        </div>
    )
}

export default AccountSearchBar
