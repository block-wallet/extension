import { useState, useCallback, useEffect } from "react"
import classnames from "classnames"
import { UseFormRegister, FieldError, Control, UseFormSetValue, UseFormClearErrors, UseFormGetValues } from "react-hook-form"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { DEFAULT_DECIMALS } from "../../util/constants"
import { Classes } from "../../styles"
import ErrorMessage from "../error/ErrorMessage"
import { getValueByKey } from "../../util/objectUtils"
import { ResponseGetState } from "@block-wallet/background/utils/types/communication"

interface AmountInputProps {
    control: Control<any> // Use specific form data type if available
    register: UseFormRegister<any>
    setValue: UseFormSetValue<any>
    getValues: UseFormGetValues<any>
    clearErrors: UseFormClearErrors<any>
    errors: { amount?: FieldError }
    selectedToken: TokenWithBalance
    nativeToken: TokenWithBalance // Needed for balance checks? Maybe pass getMaxTransactionAmount directly
    getMaxTransactionAmount: () => BigNumber
    balance: BigNumber // User's native balance
    selectedGas: any // Type TransactionFeeData
    isEIP1559Compatible?: boolean
    onAmountChange: (amount: string) => void // Callback for parent state
    onMaxClick: (useMax: boolean) => void // Callback for parent state
    blankState: ResponseGetState // Use the imported type
    disabled?: boolean
}

export const AmountInput: React.FC<AmountInputProps> = ({
    register,
    setValue,
    getValues,
    clearErrors,
    errors,
    selectedToken,
    getMaxTransactionAmount,
    onAmountChange,
    onMaxClick,
    blankState,
    disabled,
}) => {
    const [inputFocus, setInputFocus] = useState(false)
    const [usingMax, setUsingMax] = useState(false)
    const [nativeCurrencyAmt, setNativeCurrency] = useState(0)

    const calcNativeCurrency = useCallback(() => {
        if (!selectedToken) return 0;
        try {
            const amountStr = getValues().amount || "0";
            const amount: number = Number(amountStr);
            const assetAmount: number = !isNaN(amount) && amount ? amount : 0;
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            const symbol =
                selectedToken?.token.symbol.toUpperCase() ||
                blankState.networkNativeCurrency.symbol; // Use network native symbol
            const txAmount: BigNumber = parseUnits(
                assetAmount.toString(),
                decimals
            );
            const rate = getValueByKey(blankState.exchangeRates, symbol, 0);
            const nativeAmount = toCurrencyAmount(txAmount, rate, decimals);
            setNativeCurrency(nativeAmount);
            return nativeAmount;
        } catch {
            setNativeCurrency(0);
            return 0;
        }
    }, [selectedToken, getValues, blankState.exchangeRates, blankState.networkNativeCurrency.symbol]);

    // Calculate initial native currency amount
    useEffect(() => {
        calcNativeCurrency();
    }, [calcNativeCurrency]);


    const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsingMax(false); // Disable max if user types
        let value = e.target.value
            ? e.target.value
                .replace(/[^0-9.,]/g, "")
                .replace(",", ".")
                .replace(/(\..*?)\..*/g, "$1")
            : "";

        if (value === ".") {
            value = "";
        }

        if (value === "") {
            setValue("amount", "");
            clearErrors("amount");
        } else {
            // Basic validation before setting state
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            if (value.includes(".") && value.split(".")[1].length > decimals) {
                value = value.substring(0, value.indexOf(".") + decimals + 1);
            }

            setValue("amount", value, {
                shouldValidate: true, // Trigger validation
            });
        }

        const nativeAmt = calcNativeCurrency();
        onAmountChange(value); // Notify parent
    };

    const handleMaxClick = () => {
        const newUsingMax = !usingMax;
        setUsingMax(newUsingMax);
        if (newUsingMax) {
            const maxTransactionAmount = getMaxTransactionAmount();
            const decimals = selectedToken?.token.decimals || DEFAULT_DECIMALS;
            const formatAmount = formatUnits(
                BigNumber.from(maxTransactionAmount),
                decimals
            );
            setValue("amount", formatAmount, {
                shouldValidate: true,
            });
            onAmountChange(formatAmount); // Notify parent
        } else {
            setValue("amount", "", {
                shouldValidate: false, // Don't validate empty string immediately
            });
            clearErrors("amount");
            onAmountChange(""); // Notify parent
        }
        calcNativeCurrency();
        onMaxClick(newUsingMax); // Notify parent about the state change
    };

    const hasBalance = selectedToken && !BigNumber.from(selectedToken.balance).isZero();

    return (
        <div
            className={classnames(
                "flex flex-col",
                !errors.amount && "mb-3"
            )}
        >
            <div className="flex flex-row justify-between items-center">
                <label
                    htmlFor="amount"
                    className="ml-1 mb-2 text-[13px] font-medium text-primary-grey-dark"
                >
                    Amount
                </label>
                {/* Optional: Display token balance here */}
                {/* <span className="text-xs text-primary-grey-dark">
                    Balance: {formatUnits(selectedToken?.balance || 0, selectedToken?.token.decimals || DEFAULT_DECIMALS)} {selectedToken?.token.symbol}
                 </span> */}
            </div>

            <div
                className={classnames(
                    Classes.greySection,
                    inputFocus && "bg-primary-grey-hover",
                    errors.amount && "border border-red-400", // Add border for error state
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <div className="flex flex-col items-start flex-grow"> {/* Use flex-grow */}
                    <input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        {...register("amount")} // Register comes from props
                        className={classnames(
                            Classes.blueSectionInput,
                            "py-1" // Adjust padding if needed
                        )}
                        placeholder={`0 ${selectedToken
                            ? selectedToken.token.symbol
                            : ""
                            }`}
                        autoComplete="off"
                        // autoFocus={true} // Maybe disable autoFocus here, let parent decide
                        onFocus={() => !disabled && setInputFocus(true)}
                        onBlur={() => setInputFocus(false)}
                        onKeyDown={(e) => {
                            if (disabled) return;
                            // Prevent excessive numbers
                            const amt = Number(e.currentTarget.value + e.key); // Check potential value
                            if (
                                !isNaN(Number(e.key)) && // Check if key is number
                                !isNaN(Number(e.currentTarget.value)) && // Check if current value is number
                                Number(e.currentTarget.value) >= Number.MAX_SAFE_INTEGER / 10 // Check if close to max safe integer
                            ) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }}
                        onInput={handleAmountInputChange}
                        disabled={disabled}
                    />
                    <span className="text-xs text-primary-grey-dark mt-1 h-4"> {/* Ensure height */}
                        {!disabled && formatCurrency(nativeCurrencyAmt, {
                            currency: blankState.nativeCurrency,
                            locale_info: blankState.localeInfo,
                            showSymbol: true, // Show currency symbol
                        })}
                    </span>
                </div>
                <div className="w-1/5 flex items-center justify-end"> {/* Adjust layout */}
                    <button // Change span to button for accessibility
                        type="button" // Prevent form submission
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-1 text-xs font-medium", // Adjusted styling
                            usingMax
                                ? "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200" // Theme consistent colors
                                : "bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300",
                            (!hasBalance || disabled) && // Check disabled prop
                            "pointer-events-none opacity-50 text-primary-grey-dark",

                        )}
                        title={disabled ? "Amount locked" : "Use all available funds"}
                        onClick={!disabled ? handleMaxClick : undefined} // Prevent click if disabled
                        disabled={!hasBalance || disabled} // Disable button if no balance or parent disabled
                    >
                        max
                    </button>
                </div>
            </div>
            {/* Error Message Display */}
            <div
                className={classnames(
                    "h-5 mt-1", // Reserve space for error message
                    errors.amount?.message ? "pl-1" : null
                )}
            >
                <ErrorMessage>
                    {errors.amount?.message}
                </ErrorMessage>
            </div>
        </div>
    )
} 