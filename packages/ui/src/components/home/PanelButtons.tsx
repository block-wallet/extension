import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { Link } from "react-router-dom"
import classnames from "classnames"
import Icon, { IconName } from "../ui/Icon"
import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"
import RoundedIconButton, {
    RoundedLoadingButton,
} from "../button/RoundedIconButton"
import DoubleArrowHoverAnimation from "../icons/DoubleArrowHoverAnimation"
import ArrowHoverAnimation from "../icons/ArrowHoverAnimation"
import { TokenWithBalance } from "../../context/hooks/useTokensList"
import { BigNumber } from "@ethersproject/bignumber"
import { Currency } from "@block-wallet/background/utils/currency"
import { AccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"

type BaseRedirectState = {
    transitionDirection: "left" | "right"
}

type PanelButtonProps<T extends BaseRedirectState> = {
    redirectState?: T
    className?: string
    disabled: boolean
    isLoading?: boolean
}

interface RedirectBridgeState extends BaseRedirectState {
    token: Token
    fromAssetPage: boolean
}

interface RedirectSwapState extends BaseRedirectState {
    fromToken: Token
    fromTokenBalance: BigNumber
    fromAssetPage: boolean
}

interface RedirectSendState extends BaseRedirectState {
    asset: TokenWithBalance
}

interface RedirectBuyState extends BaseRedirectState {
    spend: Currency
    receive: Token
    arriveTo: AccountInfo
}

const BridgeButton: React.FC<PanelButtonProps<RedirectBridgeState>> = ({
    redirectState,
    disabled,
    isLoading,
}) => {
    return (
        <Link
            to={{
                pathname: "/bridge",
                state: redirectState,
            }}
            draggable={false}
            className={classnames(
                "flex flex-col items-center space-y-2 group",
                disabled && "pointer-events-none"
            )}
        >
            <div
                className={classnames(
                    "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                    disabled ? "bg-gray-300" : "bg-primary-300"
                )}
                style={{ transform: "scaleY(-1)" }}
            >
                {disabled ? (
                    <Icon name={IconName.DISABLED_BRIDGE} size="xl" />
                ) : (
                    <>
                        {isLoading ? (
                            <RoundedLoadingButton />
                        ) : (
                            <AnimatedIcon
                                icon={AnimatedIconName.Bridge}
                                className="cursor-pointer"
                            />
                        )}
                    </>
                )}
            </div>
            <span className="text-[13px] font-medium">Bridge</span>
        </Link>
    )
}

const SwapButton: React.FC<PanelButtonProps<RedirectSwapState>> = ({
    redirectState,
    disabled,
    isLoading,
}) => {
    return (
        <Link
            to={{
                pathname: "/swap",
                state: redirectState,
            }}
            draggable={false}
            className={classnames(
                "flex flex-col items-center space-y-2 group",
                disabled && "pointer-events-none"
            )}
        >
            <RoundedIconButton
                Icon={DoubleArrowHoverAnimation}
                disabled={disabled}
                isLoading={isLoading}
            >
                Swap
            </RoundedIconButton>
        </Link>
    )
}

const SendButton: React.FC<PanelButtonProps<RedirectSendState>> = ({
    redirectState,
    disabled,
    isLoading,
}) => {
    return (
        <Link
            to={{
                pathname: "/send",
                state: redirectState,
            }}
            draggable={false}
            className={classnames(
                "flex flex-col items-center space-y-2 group",
                disabled && "pointer-events-none"
            )}
        >
            <RoundedIconButton
                Icon={ArrowHoverAnimation}
                disabled={disabled}
                isLoading={isLoading}
            >
                Send
            </RoundedIconButton>
        </Link>
    )
}

const BuyButton: React.FC<PanelButtonProps<RedirectBuyState>> = ({
    redirectState,
    disabled,
    isLoading,
}) => {
    return (
        <Link
            to={{ pathname: "/buy", state: redirectState }}
            draggable={false}
            className={classnames(
                "flex flex-col items-center space-y-2 group",
                disabled && "pointer-events-none"
            )}
        >
            <div
                className={classnames(
                    "w-8 h-8 overflow-hidden transition duration-300 rounded-full group-hover:opacity-75",
                    disabled ? "bg-gray-300" : "bg-primary-blue-default"
                )}
            >
                {isLoading ? (
                    <div className="flex flex-row items-center justify-center w-full h-full">
                        <AnimatedIcon
                            icon={AnimatedIconName.BlueCircleLoadingSkeleton}
                            className="w-4 h-4 pointer-events-none"
                        />
                    </div>
                ) : (
                    <AnimatedIcon
                        icon={AnimatedIconName.Wallet}
                        className="cursor-pointer"
                    />
                )}
            </div>
            <span className="text-[13px] font-medium">Buy</span>
        </Link>
    )
}

const PanelButtons: {
    Bridge: typeof BridgeButton
    Swap: typeof SwapButton
    Send: typeof SendButton
    Buy: typeof BuyButton
} = {
    Bridge: BridgeButton,
    Send: SendButton,
    Swap: SwapButton,
    Buy: BuyButton,
}

export default PanelButtons
