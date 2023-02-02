import { useEffect, useRef, useState } from "react"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { MaxUint256 } from "@ethersproject/constants"
import * as yup from "yup"

import { Classes } from "../../styles"
import ErrorMessage from "../error/ErrorMessage"

const UNLIMITED_ALLOWANCE = MaxUint256

// Schema
const getAllowanceAmountYupSchema = (
    tokenDecimals: number,
    minAllowance: BigNumber
) => {
    return yup.object({
        allowanceAmount: yup
            .string()
            .test(
                "req",
                "Please enter an allowance amount",
                (value?: string) => {
                    if (!value) return false
                    return true
                }
            )
            .test(
                "decimals",
                "Value has too many decimal numbers",
                (value?: string) => {
                    if (!value) return false
                    if (!value.includes(".")) return true

                    const valueDecimals = value.split(".")[1].length

                    return valueDecimals <= tokenDecimals
                }
            )
            .test(
                "too-low",
                "Value is less than the minimum allowance",
                (value?: string) => {
                    if (!value) return false
                    try {
                        const parsed = parseUnits(value, tokenDecimals)

                        return minAllowance.lte(parsed)
                    } catch (error) {
                        return false
                    }
                }
            )
            .test(
                "too-large",
                "Value is larger than the unlimited allowance",
                (value?: string) => {
                    if (!value) return false
                    try {
                        const parsed = parseUnits(value, tokenDecimals)

                        return UNLIMITED_ALLOWANCE.gte(parsed)
                    } catch (error) {
                        return false
                    }
                }
            ),
    })
}

/**
 *
 * Allowance Amount input component
 *
 * @param onChange - function to call when the input changes
 * @param setIsValid - function to set if the input is valid or invalid
 * @param tokenDecimals - token decimals
 * @param tokenName - token name
 * @param defaultValue - default value for the input
 * @param minimumAllowance - minimum allowance for the input (used for validations)
 *
 */
const AllowanceInput = ({
    onChange,
    setIsValid,
    tokenDecimals,
    tokenName,
    defaultValue,
    minimumAllowance = BigNumber.from(0),
}: {
    onChange: (value: string) => void
    setIsValid: (value: boolean) => void
    tokenDecimals: number
    tokenName: string
    defaultValue: string
    minimumAllowance?: BigNumber
}) => {
    const [allowanceAmount, setAllowanceAmount] = useState(
        formatUnits(defaultValue, tokenDecimals)
    )
    const [error, setError] = useState("")

    const [usingUnlimited, setUsingUnlimited] = useState(false)
    const [usingRevoke, setUsingRevoke] = useState(false)

    const [inputFocus, setInputFocus] = useState(false)
    const inputRef = useRef(null)

    // Validator
    const schema = getAllowanceAmountYupSchema(tokenDecimals, minimumAllowance)

    const handleChangeAllowanceAmount = (value: string) => {
        // Replace commas with periods
        value = value.replace(",", ".")
        // Remove everything that is not a number or period
        value = value.replace(/[^0-9.]/g, "")
        // Remove all periods except the first one
        value = value.replace(/(\..*?)\..*/g, "$1")

        if (!value || value === ".") {
            value = ""
        }
        validate(value)
        setAllowanceAmount(value)

        const isRevoke = parseFloat(value) === 0
        const isUnlimited =
            parseFloat(value) ===
            parseFloat(formatUnits(UNLIMITED_ALLOWANCE, tokenDecimals))

        setUsingRevoke(isRevoke)
        setUsingUnlimited(isUnlimited)
        adjustInputCursor(value.length)
        onChange(value)
    }

    const validate = (value: string) => {
        schema
            .validate({ allowanceAmount: value })
            .then(() => {
                setError("")
                setIsValid(true)
            })
            .catch((err) => {
                setError(err.errors[0])
                setIsValid(false)
            })
    }

    const resetAllowanceValue = () => {
        handleChangeAllowanceAmount("")
        focusOnInput()
    }

    const focusOnInput = () => {
        setTimeout(() => {
            const input: any = inputRef.current
            if (input) input.focus()
        }, 0)
    }

    // Adjust input cursor position
    const adjustInputCursor = (position: number) => {
        setTimeout(() => {
            const input: any = inputRef.current
            if (input) input.setSelectionRange(position, position)
        }, 0)
    }

    useEffect(() => {
        const isUnlimited = BigNumber.from(UNLIMITED_ALLOWANCE).eq(defaultValue)
        const isRevoke = BigNumber.from(0).eq(defaultValue)

        setUsingRevoke(isRevoke)
        setUsingUnlimited(isUnlimited)
        setAllowanceAmount(formatUnits(defaultValue, tokenDecimals))
        // Needed in dependency array to update the input value when the defaultValue changes if there is multiple allowance approvals in the queue
    }, [defaultValue])

    return (
        <div className={classnames("flex flex-col")}>
            <div className="flex flex-row">
                <div className="flex items-start w-1/3">
                    <label
                        htmlFor="allowanceAmount"
                        className="mb-2 text-sm text-gray-600"
                    >
                        Allowance
                    </label>
                </div>
            </div>

            <div
                className={classnames(
                    Classes.blueSection,
                    "px-4 py-3",
                    inputFocus && "bg-primary-200",
                    error && "border-red-400"
                )}
            >
                <div className="flex flex-col items-start w-2/5">
                    {usingUnlimited && (
                        <div
                            className={classnames(
                                Classes.blueSectionInput,
                                "mb-0 text-xl flex items-center"
                            )}
                            title={`${Number(
                                formatUnits(UNLIMITED_ALLOWANCE, tokenDecimals)
                            )} ${tokenName}`}
                            onClick={() => {
                                resetAllowanceValue()
                            }}
                        >
                            &#8734;{" "}
                            <span className="text-sm ml-2">{tokenName}</span>
                            <span className="w-24"></span>
                        </div>
                    )}

                    <input
                        id="allowanceAmount"
                        type="text"
                        ref={inputRef}
                        className={classnames(
                            Classes.blueSectionInput,
                            "mb-0 text-sm",
                            usingUnlimited && "hidden"
                        )}
                        placeholder={`0 ${tokenName}`}
                        autoComplete="off"
                        autoFocus={false}
                        onFocus={() => {
                            adjustInputCursor(allowanceAmount.length)
                            setInputFocus(true)
                        }}
                        onBlur={() => setInputFocus(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                                let newAllowanceAmount = allowanceAmount.slice(
                                    0,
                                    -1
                                )

                                if (
                                    newAllowanceAmount[
                                        newAllowanceAmount.length - 1
                                    ] === "."
                                ) {
                                    newAllowanceAmount =
                                        newAllowanceAmount.slice(0, -1)
                                }

                                handleChangeAllowanceAmount(newAllowanceAmount)
                            }
                            const amt = Number(e.currentTarget.value)
                            if (
                                !isNaN(Number(e.key)) &&
                                !isNaN(amt) &&
                                amt >= Number.MAX_SAFE_INTEGER
                            ) {
                                e.preventDefault()
                                e.stopPropagation()
                            }
                        }}
                        value={`${allowanceAmount} ${tokenName}`}
                        title={`${allowanceAmount} ${tokenName}`}
                        onInput={(e: any) => {
                            adjustInputCursor(allowanceAmount.length)
                            handleChangeAllowanceAmount(e.target.value)
                        }}
                    />
                </div>
                <div className="flex space-x-2">
                    <span
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-1",
                            usingRevoke
                                ? "bg-primary-300 border-primary-300 text-white hover:bg-blue-600 hover:border-blue-600"
                                : "bg-blue-200 border-blue-200 hover:bg-blue-300 hover:border-blue-300"
                        )}
                        title={`Revoke value`}
                        onClick={() => {
                            if (usingRevoke) {
                                resetAllowanceValue()
                            } else {
                                handleChangeAllowanceAmount(
                                    formatUnits(0, tokenDecimals)
                                )
                            }
                        }}
                    >
                        Revoke
                    </span>
                    <span
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-1",
                            usingUnlimited
                                ? "bg-primary-300 border-primary-300 text-white hover:bg-blue-600 hover:border-blue-600"
                                : "bg-blue-200 border-blue-200 hover:bg-blue-300 hover:border-blue-300"
                        )}
                        title={`Unlimited value`}
                        onClick={() => {
                            if (usingUnlimited) {
                                resetAllowanceValue()
                            } else {
                                handleChangeAllowanceAmount(
                                    formatUnits(
                                        UNLIMITED_ALLOWANCE.toHexString(),
                                        tokenDecimals
                                    )
                                )
                            }
                        }}
                    >
                        Unlimited
                    </span>
                </div>
            </div>
            <div className={`${error ? "pl-1" : null}`}>
                <ErrorMessage>{error}</ErrorMessage>
            </div>
        </div>
    )
}

export default AllowanceInput
