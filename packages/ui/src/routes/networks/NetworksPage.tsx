import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import plusIcon from "../../assets/images/icons/plus.svg"
import { ActionButton } from "../../components/button/ActionButton"
import { useBlankState } from "../../context/background/backgroundHooks"
import { sortNetworksByOrder } from "../../util/networkUtils"
import { ethers } from "ethers"
import { getAccountColor } from "../../util/getAccountColor"
import { Network } from "@block-wallet/background/utils/constants/networks"
import { RiArrowRightSLine } from "react-icons/ri"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

interface NetworkInfo extends Network {
    color: string
}

interface MappedNetoworks {
    testnets: NetworkInfo[]
    mainnets: NetworkInfo[]
}

const NetworkDisplay = ({
    networkInfo,
    onClick,
}: {
    networkInfo: NetworkInfo
    onClick: () => void
}) => {
    return (
        <div
            onClick={onClick}
            className="hover:bg-gray-100 hover:cursor-pointer rounded-md"
        >
            <div className="flex flex-row justify-between items-center p-2">
                <div className="flex flex-row space-x-2 items-center">
                    <span
                        className="h-2 w-2 rounded-xl"
                        style={{
                            backgroundColor: networkInfo.color,
                        }}
                    />
                    <span
                        title={networkInfo.desc}
                        className="text-sm font-bold w-64 text-ellipsis overflow-hidden whitespace-nowrap"
                    >
                        {networkInfo.desc}
                    </span>
                </div>
                <RiArrowRightSLine className="stroke-black" size={16} />
            </div>
        </div>
    )
}

const NetworksPage = () => {
    const { availableNetworks } = useBlankState()!
    const history = useOnMountHistory()
    const parsedNetworks = Object.values(availableNetworks)
        .sort(sortNetworksByOrder)
        .reduce(
            (acc: MappedNetoworks, current: Network) => {
                if (!current.enable) {
                    return acc
                }
                const color = getAccountColor(
                    ethers.utils.keccak256(
                        ethers.utils.toUtf8Bytes(current.name || current.desc)
                    )
                )
                const netInfo: NetworkInfo = {
                    ...current,
                    color,
                }
                if (current.test) {
                    return {
                        ...acc,
                        testnets: [...acc.testnets, netInfo],
                    }
                }
                return {
                    ...acc,
                    mainnets: [...acc.mainnets, netInfo],
                }
            },
            {
                testnets: [],
                mainnets: [],
            }
        )

    const onClickNetwork = (network: NetworkInfo) => {
        history.push({
            pathname: "/settings/networks/details",
            state: {
                network,
            },
        })
    }
    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Networks"
                    onBack={() => history.push("/settings")}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-6 w-full">
                <ActionButton
                    icon={plusIcon}
                    label="Add New Network"
                    to="/settings/networks/search"
                />
                <div className="flex flex-col space-y-2">
                    <span className="text-xs text-gray-500">MAINNET</span>
                    <div className="flex flex-col space-y-2">
                        {parsedNetworks.mainnets.map((option) => (
                            <NetworkDisplay
                                key={option.chainId}
                                networkInfo={option}
                                onClick={() => onClickNetwork(option)}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-gray-500 mt-4">TESTNET</span>
                    <div className="flex flex-col space-y-2">
                        {parsedNetworks.testnets.map((option) => (
                            <NetworkDisplay
                                key={option.chainId}
                                networkInfo={option}
                                onClick={() => onClickNetwork(option)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default NetworksPage
