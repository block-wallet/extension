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
const getAmountYupSchema = (
    isAllowance: boolean,
    tokenDecimals: number,
    minAllowance: BigNumber
) => {
    return yup.object({
        amount: yup
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
                "Custom limit has too many decimal numbers",
                (value?: string) => {
                    if (!value) return false
                    if (!value.includes(".")) return true

                    const valueDecimals = value.split(".")[1].length

                    return valueDecimals <= tokenDecimals
                }
            )
            .test(
                "too-low",
                "Custom limit is less than the minimum allowance",
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
                "Custom limit is larger than the unlimited allowance",
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
 * Amount input component
 *
 * @param onChange - function to call when the input changes
 * @param setIsValid - function to set if the input is valid or invalid
 * @param tokenDecimals - token decimals
 * @param tokenName - token name
 * @param maxValue - max value for the input
 * @param defaultValue - default value for the input
 * @param isAllowance - if the input is for an token allowance or amount
 * @param minimumAmount - minimum amount for the input (used for validations)
 *
 */
const AmountInput = ({
    onChange,
    setIsValid,
    tokenDecimals,
    tokenName,
    maxValue = UNLIMITED_ALLOWANCE.toHexString(),
    defaultValue,
    isAllowance = false,
    minimumAmount = BigNumber.from(0),
}: {
    onChange: (value: string) => void
    setIsValid: (value: boolean) => void
    tokenDecimals: number
    tokenName: string
    maxValue?: string
    defaultValue: string
    isAllowance?: boolean
    minimumAmount?: BigNumber
}) => {
    const [amount, setAmount] = useState(
        formatUnits(defaultValue, tokenDecimals)
    )
    const [error, setError] = useState("")

    const [usingMax, setUsingMax] = useState(false)
    const [inputFocus, setInputFocus] = useState(false)
    const inputRef = useRef(null)

    // Validator
    const schema = getAmountYupSchema(isAllowance, tokenDecimals, minimumAmount)

    const handleChangeAmount = (value: string) => {
        value = value
            .replace(",", ".")
            .replace(/[^0-9.]/g, "")
            .replace(/(\..*?)\..*/g, "$1")

        if (!value || value === ".") {
            value = ""
        }
        validate(value)
        setAmount(value)
        adjustInputCursor(value.length)
        onChange(value)
    }

    const validate = (value: string) => {
        schema
            .validate({ amount: value })
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
        handleChangeAmount("")
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
        // If is allowance amount & allowance is unlimited, set usingMax to true
        if (BigNumber.from(maxValue).eq(defaultValue)) {
            setUsingMax(true)
        }
    }, [])

    useEffect(() => {
        setAmount(formatUnits(defaultValue, tokenDecimals))
    }, [defaultValue])

    return (
        <div className={classnames("flex flex-col")}>
            <div className="flex flex-row">
                <div className="flex items-start w-1/3">
                    <label
                        htmlFor="amount"
                        className="mb-2 text-sm text-gray-600"
                    >
                        {isAllowance ? "Allowance" : "Amount"}
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
                <div className="flex flex-col items-start">
                    {usingMax && isAllowance && (
                        <div
                            className={classnames(
                                Classes.blueSectionInput,
                                "mb-0 text-xl flex items-center"
                            )}
                            title={`${Number(
                                formatUnits(UNLIMITED_ALLOWANCE, tokenDecimals)
                            )} ${tokenName}`}
                            onClick={() => {
                                setUsingMax(false)
                                resetAllowanceValue()
                            }}
                        >
                            &#8734;{" "}
                            <span className="text-sm ml-2">{tokenName}</span>
                            <span className="w-24"></span>
                        </div>
                    )}

                    <input
                        id="amount"
                        type="text"
                        ref={inputRef}
                        className={classnames(
                            Classes.blueSectionInput,
                            "mb-0 text-sm",
                            usingMax && isAllowance && "hidden"
                        )}
                        placeholder={`0 ${tokenName}`}
                        autoComplete="off"
                        autoFocus={false}
                        onFocus={() => {
                            adjustInputCursor(amount.length)
                            setUsingMax(false)
                            setInputFocus(true)
                        }}
                        onBlur={() => setInputFocus(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                                let newAmount = amount.slice(0, -1)

                                if (newAmount[newAmount.length - 1] === ".") {
                                    newAmount = newAmount.slice(0, -1)
                                }

                                handleChangeAmount(newAmount)
                            }
                            setUsingMax(false)
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
                        value={`${amount} ${tokenName}`}
                        title={`${amount} ${tokenName}`}
                        onInput={(e: any) => handleChangeAmount(e.target.value)}
                        onClick={() => {
                            adjustInputCursor(amount.length)
                        }}
                    />
                </div>
                <div className="w-1/5">
                    <span
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-1",
                            usingMax
                                ? "bg-primary-300 border-primary-300 text-white hover:bg-blue-600 hover:border-blue-600"
                                : "bg-blue-200 border-blue-200 hover:bg-blue-300 hover:border-blue-300"
                        )}
                        title={`Use max value possible.`}
                        onClick={() => {
                            if (usingMax) {
                                setUsingMax(false)
                                resetAllowanceValue()
                            } else {
                                setUsingMax(true)
                                handleChangeAmount(
                                    formatUnits(maxValue, tokenDecimals)
                                )
                            }
                        }}
                    >
                        {isAllowance ? "Unlimited" : "Max"}
                    </span>
                </div>
            </div>
            <div className={`${error ? "pl-1" : null}`}>
                <ErrorMessage>{error}</ErrorMessage>
            </div>
        </div>
    )
}

export default AmountInput
