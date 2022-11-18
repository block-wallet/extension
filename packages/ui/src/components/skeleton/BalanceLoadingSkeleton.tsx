import AnimatedIcon, { AnimatedIconName } from "../AnimatedIcon"

const BalanceLoadingSkeleton = () => {
    return (
        <div className="flex flex-col items-center space-y-2">
            <AnimatedIcon
                icon={AnimatedIconName.BlueLineLoadingSkeleton}
                className="w-32 h-4 pointer-events-none"
                svgClassName="rounded-md"
                loop
            />
            <AnimatedIcon
                icon={AnimatedIconName.BlueLineLoadingSkeleton}
                className="w-16 h-4 pointer-events-none rotate-180"
                svgClassName="rounded-md"
                loop
            />
        </div>
    )
}

export default BalanceLoadingSkeleton
