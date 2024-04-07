import { forwardRef, useState, useRef } from "react"

// Style
import classnames from "classnames"
import { Classes } from "../../styles/classes"

// Hooks
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { useMergeRefs } from "../../context/hooks/useMergeRefs"

// Assets
import searchIcon from "../../assets/images/icons/search.svg"
import CheckmarkCircle from "../icons/CheckmarkCircle"

// Types
type SearchInputProps = {
    label?: string
    placeholder?: string
    register?: any
    name?: string
    error?: string
    warning?: string
    disabled?: boolean
    autoFocus?: boolean
    autoComplete?: boolean
    isValid?: boolean
    onChange?: (event: any) => void
    onPaste?: (event: any) => void
    debounced?: boolean
    debounceTime?: number
    minSearchChar?: number
    defaultValue?: string
    inputClassName?: string
    searchShowSkeleton?: React.Dispatch<React.SetStateAction<boolean>>
    showClearIcon?: boolean
}

/**
 * SearchInput:
 * Creates a search text input.
 * On focus will hide search icon, and when isValid props is set to true, display a green outline & checkmark.
 *
 * @param label - Display label above input.
 * @param placeholder - Placeholder for the input.
 * @param name - Name of the input, for yup validation.
 * @param register - Yup reference.
 * @param error - Yup error or message to display as red error under input.
 * @param warning - Warning orange message to display under input.
 * @param disabled - Disabling input if true.
 * @param autoFocus - Auto focus input when entering page if true.
 * @param autoComplete - Enable browser autocomplete suggestions if true.
 * @param isValid - Display a green outline & checkmark if true.
 * @param onChange - Function to execute on input change.
 * @param onPaste - Function to execute when user paste into the input.
 * @param debounced - If set to true, onChange will only be triggered after the user didn't change the input for `debounceTime`.
 * @param debounceTime - Set the debouncing time.
 * @param minSearchChar - Set a minimum char before triggering `onChange`. Note that this has the priority over `onChange` and `debounce`.
 * @param defaultValue - In AssetSelection we already have a value which was previously looked for. So we paste it as default in case of "add new token"
 * @param showClearIcon - It makes input as "search" intut instead of "text" input
 */
const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    (
        {
            label,
            placeholder,
            name,
            error = "",
            warning = "",
            disabled,
            autoFocus,
            autoComplete,
            isValid,
            onChange,
            onPaste,
            debounced = false,
            debounceTime = 300,
            minSearchChar = 0,
            register,
            defaultValue,
            inputClassName,
            searchShowSkeleton,
            showClearIcon = false,
        }: SearchInputProps,
        ref
    ) => {
        const inputRef = useRef(null)
        const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>()
        // State
        const [isFocus, setIsFocus] = useState<boolean>(false)
        const [search, setSearch] = useState<string>("")

        // Hooks

        useOnClickOutside(inputRef, () => {
            if (search === "") setIsFocus(false)
        })

        const onValueChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value)
            if (onChange) onChange(e)
        }

        return (
            <>
                {/* LABEL */}
                {label ? (
                    <label htmlFor="accountName" className={Classes.inputLabel}>
                        {label}
                    </label>
                ) : null}

                {/* SEARCH */}
                <div
                    className={classnames(
                        "flex justify-start items-center relative",
                        label ? "" : "",
                        error !== "" || warning !== "" ? "mb-2" : ""
                    )}
                >
                    <img
                        src={searchIcon}
                        alt="search"
                        className={classnames(
                            "h-4 ml-3 absolute z-10 transition-all delay-100",
                            isFocus ? "opacity-0 w-0" : "opacity-100 w-4"
                        )}
                    />

                    <input
                        name={name ? name : "Search"}
                        type={showClearIcon ? "search" : "text"}
                        ref={useMergeRefs(
                            inputRef,
                            ref,
                            register ? register : null
                        )}
                        className={classnames(
                            Classes.inputBordered,
                            "w-full relative z-0 outline-none transition-all delay-100",
                            isFocus ? "pl-2" : "pl-9",
                            inputClassName,
                            isValid
                                ? "border-green-400 focus:border-green-400"
                                : ""
                        )}
                        placeholder={placeholder ? placeholder : ""}
                        autoFocus={autoFocus ? autoFocus : false}
                        disabled={disabled ? disabled : false}
                        autoComplete={autoComplete ? "on" : "off"}
                        onChange={(e) => {
                            const value = e.target.value

                            // If user emptied the input, trigger change to clear filters
                            if (value === "") return onValueChanged(e)

                            if (value.length < minSearchChar) return

                            if (debounced) {
                                if (timeoutIdRef.current)
                                    clearTimeout(timeoutIdRef.current)

                                timeoutIdRef.current = setTimeout(() => {
                                    onValueChanged(e)

                                    if (
                                        searchShowSkeleton &&
                                        e.target.value !== ""
                                    )
                                        searchShowSkeleton(true)
                                }, debounceTime)
                            } else {
                                if (searchShowSkeleton && e.target.value !== "")
                                    searchShowSkeleton(true)
                                onValueChanged(e)
                            }
                        }}
                        onPaste={onPaste}
                        onFocus={() => setIsFocus(true)}
                        defaultValue={defaultValue ?? ""}
                    />
                    <CheckmarkCircle
                        classes={`
              h-4 transition-all delay-100
              ${isValid ? "opacity-100 w-4 ml-3" : "opacity-0 w-0 ml-0"}
            `}
                        animate={isValid}
                    />
                </div>

                {/* ERROR */}
                <span
                    className={classnames(
                        "text-xs",
                        error !== "" ? "text-red-500" : "",
                        warning !== "" ? "text-yellow-500" : "",
                        error === "" && warning === "" ? "m-0 h-0" : ""
                    )}
                >
                    {error || warning || ""}
                </span>
            </>
        )
    }
)

export default SearchInput
