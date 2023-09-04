import classnames from "classnames"
import ThreeDotsIcon from "../icons/ThreeDotsIcon"
import GroupIcon from "../icons/GroupIcon"
import SearchIcon from "../icons/SearchIcon"
import CheckmarkIcon from "../icons/CheckmarkIcon"
import CrossedOutEyeIcon from "../icons/CrossedOutEyeIcon"
import EyeIcon from "../icons/EyeIcon"
import TrashBinIcon from "../icons/TrashBinIcon"
import PencilIcon from "../icons/PencilIcon"
import PlusIcon from "../icons/PlusIcon"
import EmptyDrawerIcon from "../icons/EmptyDrawerIcon"
import WalletIcon from "../icons/WalletIcon"
import UsbIcon from "../icons/UsbIcon"
import { RightChevronIcon } from "../icons/RightChevronIcon"
import ImportIcon from "../icons/ImportIcon"
import ClockIcon from "../icons/ClockIcon"
import SwitchIcon from "../icons/SwitchIcon"
import RefetchIcon from "../icons/RefetchIcon"
import DisabledBridgeIcon from "../icons/DisabledBridgeIcon"
import FilterIcon from "../icons/FilterIcon"
import OrderIcon from "../icons/OrderIcon"

export enum IconName {
    PENCIL = "PENCIL",
    GROUP = "GROUP",
    THREE_DOTS = "THREE_DOTS",
    SEARCH = "SEARCH",
    CHECKMARK = "CHECKMARK",
    CROSSED_OUT_EYE = "CROSSED_OUT_EYE",
    EYE = "EYE",
    TRASH_BIN = "TRASH_BIN",
    PLUS = "PLUS",
    EMPTY_DRAWER = "EMPTY_DRAWER",
    WALLET = "WALLET",
    USB = "USB",
    RIGHT_CHEVRON = "RIGHT_CHEVRON",
    IMPORT = "IMPORT",
    CLOCK = "CLOCK",
    SWITCH = "SWITCH",
    REFETCH = "REFETCH",
    DISABLED_BRIDGE = "DISABLED_BRIDGE",
    FILTER = "FILTER",
    ORDER = "ORDER",
}

type ProfileType = "default" | "selected" | "danger" | "disabled"

interface IconProps {
    name: IconName
    profile?: ProfileType
    size?: "sm" | "md" | "lg" | "xl" | "xxl"
    className?: string
}

const ICONS = {
    [IconName.GROUP]: GroupIcon,
    [IconName.THREE_DOTS]: ThreeDotsIcon,
    [IconName.SEARCH]: SearchIcon,
    [IconName.CHECKMARK]: CheckmarkIcon,
    [IconName.CROSSED_OUT_EYE]: CrossedOutEyeIcon,
    [IconName.EYE]: EyeIcon,
    [IconName.TRASH_BIN]: TrashBinIcon,
    [IconName.PENCIL]: PencilIcon,
    [IconName.PLUS]: PlusIcon,
    [IconName.EMPTY_DRAWER]: EmptyDrawerIcon,
    [IconName.WALLET]: WalletIcon,
    [IconName.USB]: UsbIcon,
    [IconName.IMPORT]: ImportIcon,
    [IconName.RIGHT_CHEVRON]: RightChevronIcon,
    [IconName.CLOCK]: ClockIcon,
    [IconName.SWITCH]: SwitchIcon,
    [IconName.REFETCH]: RefetchIcon,
    [IconName.DISABLED_BRIDGE]: DisabledBridgeIcon,
    [IconName.FILTER]: FilterIcon,
    [IconName.ORDER]: OrderIcon,
}

const STROKED_ICONS = [IconName.RIGHT_CHEVRON]

const PROFILE_STYLES = (
    type: "fill" | "stroke"
): { [key in ProfileType]: string } =>
    // Can't use literals here because of tailwind
    type === "fill"
        ? {
              default: "", //leaves every icon to define it's own color.
              selected: `!fill-selected`,
              danger: `!fill-danger`,
              disabled: `!fill-gray`,
          }
        : {
              default: "", //leaves every icon to define it's own color.
              selected: `!stroke-selected`,
              danger: `!stroke-danger`,
              disabled: `!stroke-gray`,
          }

const SIZES = {
    sm: "!w-3 !h-3",
    md: "!w-4 !h-4",
    lg: "!w-5 !h-5",
    xl: "!w-8 !h-8",
    xxl: "!w-20 !h-20",
}

const Icon: React.FC<IconProps> = ({ name, profile, size, className }) => {
    const Icon = ICONS[name]
    const sizeClasses = SIZES[size || "md"]
    const iconType = STROKED_ICONS.includes(name) ? "stroke" : "fill"
    return (
        <div className={classnames(sizeClasses, className)}>
            <Icon
                className={classnames(
                    PROFILE_STYLES(iconType)[profile || "default"],
                    sizeClasses
                )}
            />
        </div>
    )
}

export default Icon
