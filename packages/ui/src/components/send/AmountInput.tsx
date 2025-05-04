import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import classnames from "classnames"
import { UseFormRegister, FieldError, Control, UseFormSetValue, UseFormClearErrors, UseFormGetValues, useWatch, Controller } from "react-hook-form"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits, parseUnits } from "@ethersproject/units"
import { formatCurrency, toCurrencyAmount } from "../../util/formatCurrency"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { DEFAULT_DECIMALS } from "../../util/constants"
import { Classes } from "../../styles"
import ErrorMessage from "../error/ErrorMessage"
import { getValueByKey } from "../../util/objectUtils"
import { ResponseGetState } from "@block-wallet/background/utils/types/communication"
import { toChecksumAddress } from "ethereumjs-util"

// Helper function to normalize addresses for comparison
const normalizeAddress = (address: string): string => {
    return address.toLowerCase();
}

// Helper function to ensure address is checksummed
const ensureChecksumAddress = (address: string): string => {
    try {
        return toChecksumAddress(address);
    } catch (e) {
        console.error("Failed to checksum address:", e);
        return address; // Return original if checksum fails
    }
}

// Improved debounce hook that returns both the debounced value and a setter
const useDebouncedValue = <T,>(initialValue: T, delay: number = 300): [T, (value: T) => void, boolean] => {
    const [value, setValue] = useState<T>(initialValue);
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const setValueWithDebounce = useCallback((newValue: T) => {
        setValue(newValue);
        setIsDebouncing(true);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setDebouncedValue(newValue);
            setIsDebouncing(false);
        }, delay);
    }, [delay]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return [debouncedValue, setValueWithDebounce, isDebouncing];
};

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
    className?: string // Add className prop
}

export const AmountInput: React.FC<AmountInputProps> = React.memo(({
    register,
    setValue,
    control,
    clearErrors,
    errors,
    selectedToken,
    nativeToken,
    getMaxTransactionAmount,
    balance,
    selectedGas,
    isEIP1559Compatible,
    onAmountChange,
    onMaxClick,
    blankState,
    disabled,
    className,
}) => {
    const [inputFocus, setInputFocus] = useState(false);
    const [usingMax, setUsingMax] = useState(false);
    const [nativeCurrencyAmt, setNativeCurrency, isCalculatingCurrency] = useDebouncedValue(0, 800);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const lastInputValueRef = useRef<string>("");
    const [balanceError, setBalanceError] = useState<string | null>(null);

    // Create a single decimals constant for consistent use
    const decimals = selectedToken?.token.decimals ?? DEFAULT_DECIMALS;

    // Ensure token symbol is consistent
    const tokenAddress = selectedToken?.token.address ? normalizeAddress(selectedToken.token.address) : '';
    const symbol = selectedToken?.token.symbol.toUpperCase() ?? blankState.networkNativeCurrency.symbol;

    // Check if amount exceeds balance
    const validateBalance = useCallback((amountStr: string) => {
        if (!amountStr || amountStr === "0" || !selectedToken) {
            setBalanceError(null);
            return true;
        }

        try {
            // For the native token (ETH/etc.), we need to account for gas costs
            if (selectedToken.token.address === nativeToken.token.address) {
                const amountBN = parseUnits(amountStr, decimals);
                const gasCost = BigNumber.from(
                    isEIP1559Compatible ?
                        selectedGas.maxFeePerGas :
                        selectedGas.gasPrice
                ).mul(selectedGas.gasLimit);

                const totalCost = amountBN.add(gasCost);

                if (totalCost.gt(balance)) {
                    setBalanceError(`Insufficient funds for this transaction including gas costs (${formatUnits(balance, decimals)} ${symbol} available)`);
                    return false;
                }
            }
            // For ERC-20 tokens, simply compare to token balance
            else {
                const amountBN = parseUnits(amountStr, decimals);

                if (amountBN.gt(selectedToken.balance)) {
                    setBalanceError(`Amount exceeds your balance (${formatUnits(selectedToken.balance, decimals)} ${symbol} available)`);
                    return false;
                }
            }

            setBalanceError(null);
            return true;
        } catch (e) {
            console.error("Error validating balance:", e);
            return false;
        }
    }, [selectedToken, nativeToken, decimals, balance, selectedGas, isEIP1559Compatible, symbol]);

    const calcNativeCurrency = useCallback((amountStr: string) => {
        if (!selectedToken) return 0;
        try {
            const amount: number = Number(amountStr || "0");
            const assetAmount: number = !isNaN(amount) && amount ? amount : 0;
            const txAmount: BigNumber = parseUnits(
                assetAmount.toString(),
                decimals
            );
            const rate = getValueByKey(blankState.exchangeRates, symbol, 0);
            const nativeAmount = toCurrencyAmount(txAmount, rate, decimals);
            return nativeAmount;
        } catch {
            return 0;
        }
    }, [selectedToken, decimals, symbol, blankState.exchangeRates]);

    // Update currency calculation when form value changes
    const watchedAmount = useWatch({
        control,
        name: "amount",
        defaultValue: "",
    });

    // Validate balance whenever amount or token changes
    useEffect(() => {
        validateBalance(watchedAmount);
    }, [watchedAmount, validateBalance, selectedToken, selectedGas]);

    // Use a debounced effect to prevent excessive currency calculations
    useEffect(() => {
        // Skip unnecessary calculations if the value hasn't changed
        if (watchedAmount === lastInputValueRef.current) {
            return;
        }

        lastInputValueRef.current = watchedAmount;

        // Add additional debounce to prevent excessive calculations
        const timer = setTimeout(() => {
            const newNativeAmount = calcNativeCurrency(watchedAmount);
            setNativeCurrency(newNativeAmount);
        }, 200); // Small additional debounce

        return () => clearTimeout(timer);
    }, [watchedAmount, calcNativeCurrency, setNativeCurrency]);

    // Preserve input focus when component re-renders
    useEffect(() => {
        if (inputFocus && inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.focus();

            // Preserve cursor position if possible
            const cursorPosition = inputRef.current.selectionStart;
            if (cursorPosition !== null) {
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }, 0);
            }
        }
    });

    // Format and validate input value
    const formatAndValidateInput = (value: string) => {
        if (!value) return "";

        // Handle formatting
        let formattedValue = value
            .replace(/[^0-9.,]/g, "")
            .replace(",", ".")
            .replace(/(\..*?)\..*/g, "$1");

        if (formattedValue === ".") {
            return "";
        }

        // Decimal validation
        if (formattedValue.includes(".") && formattedValue.split(".")[1].length > decimals) {
            formattedValue = formattedValue.substring(0, formattedValue.indexOf(".") + decimals + 1);
        }

        return formattedValue;
    };

    // Debounce the parent notification to reduce state updates
    const debouncedOnAmountChange = useCallback(
        (() => {
            let timer: NodeJS.Timeout | null = null;
            return (amount: string) => {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(() => {
                    onAmountChange(amount);
                }, 500); // Increased debounce for parent updates
            };
        })(),
        [onAmountChange]
    );

    // Max button handling with functional state updates
    const handleMaxClick = () => {
        setUsingMax(prevUsingMax => {
            const newUsingMax = !prevUsingMax;

            if (newUsingMax) {
                const maxTransactionAmount = getMaxTransactionAmount();
                const formatAmount = formatUnits(
                    maxTransactionAmount,
                    decimals
                );

                setValue("amount", formatAmount, {
                    shouldValidate: true,
                });
                debouncedOnAmountChange(formatAmount);
            } else {
                setValue("amount", "", {
                    shouldValidate: false,
                });
                clearErrors("amount");
                debouncedOnAmountChange("");
            }

            // Call the parent's onMaxClick callback
            onMaxClick(newUsingMax);

            return newUsingMax;
        });
    };

    const hasBalance = useMemo(() =>
        selectedToken && !BigNumber.from(selectedToken.balance).isZero(),
        [selectedToken]
    );

    // Combine all errors for display
    const displayError = errors.amount?.message || balanceError;

    return (
        <div
            className={classnames(
                "flex flex-col",
                !displayError && "mb-3",
                className
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
                <span className="text-xs text-primary-grey-dark">
                    Balance: {selectedToken ? formatUnits(selectedToken.balance || 0, decimals) : '0'} {symbol}
                </span>
            </div>

            <div
                className={classnames(
                    Classes.greySection,
                    inputFocus && "bg-primary-grey-hover",
                    displayError && "border border-red-400",
                    disabled && "opacity-50 cursor-not-allowed",
                    "p-2"
                )}
            >
                <div className="flex flex-col items-start flex-grow mr-2">
                    <Controller
                        name="amount"
                        control={control}
                        render={({ field }) => (
                            <input
                                id="amount"
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9.]*"
                                className={classnames(
                                    Classes.blueSectionInput,
                                    "py-2 sm:py-1"
                                )}
                                placeholder={`0 ${selectedToken
                                    ? selectedToken.token.symbol
                                    : ""
                                    }`}
                                autoComplete="off"
                                disabled={disabled}
                                ref={(el) => {
                                    inputRef.current = el;
                                    // Handle ref from react-hook-form if needed
                                    if (typeof field.ref === 'function') {
                                        field.ref(el);
                                    }
                                }}
                                onFocus={() => !disabled && setInputFocus(true)}
                                onBlur={() => {
                                    setInputFocus(false);
                                    field.onBlur();
                                }}
                                onKeyDown={(e) => {
                                    if (disabled) return;
                                    // Prevent excessive numbers
                                    const amt = Number(e.currentTarget.value + e.key);
                                    if (
                                        !isNaN(Number(e.key)) &&
                                        !isNaN(Number(e.currentTarget.value)) &&
                                        Number(e.currentTarget.value) >= Number.MAX_SAFE_INTEGER / 10
                                    ) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                                value={field.value || ""}
                                onChange={(e) => {
                                    // Disable max mode if typing
                                    if (usingMax) {
                                        setUsingMax(false);
                                        onMaxClick(false);
                                    }

                                    const formattedValue = formatAndValidateInput(e.target.value);
                                    field.onChange(formattedValue);

                                    // Notify parent with debounce
                                    debouncedOnAmountChange(formattedValue);
                                }}
                            />
                        )}
                    />
                    <span className="text-xs text-primary-grey-dark mt-1 h-4">
                        {!disabled && formatCurrency(nativeCurrencyAmt, {
                            currency: blankState.nativeCurrency,
                            locale_info: blankState.localeInfo,
                            showSymbol: true,
                        })}
                    </span>
                </div>
                <div className="w-auto flex items-center justify-end">
                    <button
                        type="button"
                        className={classnames(
                            "float-right rounded-md cursor-pointer border p-2 text-xs font-medium",
                            usingMax
                                ? "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300",
                            (!hasBalance || disabled) &&
                            "pointer-events-none opacity-50 text-primary-grey-dark",

                        )}
                        title={disabled ? "Amount locked" : "Use all available funds"}
                        onClick={!disabled ? handleMaxClick : undefined}
                        disabled={!hasBalance || disabled}
                    >
                        max
                    </button>
                </div>
            </div>
            {/* Error Message Display */}
            <div
                className={classnames(
                    "h-5 mt-1",
                    displayError ? "pl-1" : null
                )}
            >
                <ErrorMessage>
                    {displayError}
                </ErrorMessage>
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render for specific changes that should affect the UI

    // Safe balance comparison helper
    const compareBalances = () => {
        // Check if both balances exist and are BigNumber objects with eq method
        if (prevProps.selectedToken?.balance && nextProps.selectedToken?.balance) {
            try {
                // Check if eq method exists (it's a BigNumber)
                if (typeof prevProps.selectedToken.balance.eq === 'function') {
                    return prevProps.selectedToken.balance.eq(nextProps.selectedToken.balance);
                }
            } catch (e) {
                console.error('Error comparing balances:', e);
            }
        }

        // Fallback to string comparison if BigNumber comparison isn't possible
        return String(prevProps.selectedToken?.balance) === String(nextProps.selectedToken?.balance);
    };

    return (
        prevProps.disabled === nextProps.disabled &&
        prevProps.errors?.amount?.message === nextProps.errors?.amount?.message &&
        prevProps.selectedToken?.token.address === nextProps.selectedToken?.token.address &&
        prevProps.selectedToken?.token.symbol === nextProps.selectedToken?.token.symbol &&
        compareBalances() &&
        JSON.stringify(prevProps.blankState.exchangeRates) === JSON.stringify(nextProps.blankState.exchangeRates)
        // Note: We intentionally don't check selectedGas here as we want to prevent re-renders from gas changes
    );
}); 