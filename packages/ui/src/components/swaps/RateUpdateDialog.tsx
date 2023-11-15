import Dialog from "../dialog/Dialog"
import Divider from "../Divider"
import { FC, memo, useEffect, useRef, useState } from "react"
import { Classes } from "../../styles"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import { defaultAdvancedSettings } from "../transactions/AdvancedSettings"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { formatNumberLength } from "../../util/formatNumberLength"

interface RateUpdateDialogProps {
    assetDecimals: number
    assetName: string
    rate: BigNumber
    threshold?: number
}

const RateUpdateDialog: FC<RateUpdateDialogProps> = ({
    assetName,
    assetDecimals,
    rate,
    threshold,
}) => {
    const history = useOnMountHistory()
    const lastRateRef = useRef<BigNumber | undefined>()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        const th = threshold || defaultAdvancedSettings.slippage

        // P is a difference ratio between 0..10000
        // The extra 100 in the multiplication is to have two more precision digits
        let p: number = 10000
        const lastRate = lastRateRef.current
        if (!lastRate) {
            lastRateRef.current = rate
            return
        }
        if (rate.gt(lastRate)) {
            p = lastRate
                .mul(100 * 100)
                .div(rate)
                .toNumber()
        } else if (lastRate.gt(rate)) {
            p = rate
                .mul(100 * 100)
                .div(lastRate)
                .toNumber()
        }

        const percentage = (1 - p / (100 * 100)) * 100

        if (percentage > th) {
            setIsOpen(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rate._hex, threshold])

    return (
        <Dialog open={isOpen}>
            <div className="flex flex-col w-full space-y-2 px-3">
                <p className="text-lg font-semibold">Rate has changed!</p>
                <p className="text-sm py-2">
                    Rate expired. Please acknowledge the receiving amount
                    update.
                </p>
                <p className="text-xs text-primary-grey-dark">OLD AMOUNT</p>
                <p className="text-sm font-semibold">
                    {`${formatNumberLength(
                        formatUnits(
                            lastRateRef.current || BigNumber.from(0),
                            assetDecimals
                        ),
                        10
                    )} ${assetName}`}
                </p>
                <p className="text-xs text-primary-grey-dark pt-2">
                    NEW AMOUNT
                </p>
                <p className="text-sm font-semibold">
                    {`${formatNumberLength(
                        formatUnits(rate || BigNumber.from(0), assetDecimals),
                        10
                    )} ${assetName}`}
                </p>
                <div className="-mx-6 py-3">
                    <Divider />
                </div>
                <div className="flex w-full space-x-2">
                    <ButtonWithLoading
                        label="Cancel"
                        buttonClass={Classes.redButton}
                        onClick={() => history.push("/home")}
                    />
                    <ButtonWithLoading
                        label="Accept"
                        buttonClass={Classes.button}
                        onClick={() => {
                            lastRateRef.current = rate
                            setIsOpen(false)
                        }}
                    />
                </div>
            </div>
        </Dialog>
    )
}

export default memo(RateUpdateDialog)
