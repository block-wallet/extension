import { screen } from "@testing-library/react"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { renderWithBackgroundProvider } from "../testUtils"
import { initBackgroundState } from "../../mock/MockBackgroundState"

const UseSelectedNetworkHookLogo = () => {
    const { defaultNetworkLogo } = useSelectedNetwork()
    return (
        <div>
            <img alt="logo" src={defaultNetworkLogo} />
        </div>
    )
}

test("should render the default logo", () => {
    renderWithBackgroundProvider(<UseSelectedNetworkHookLogo />, {})
    const element = screen.getByRole("img")
    expect(element).toBeDefined()
    expect(element).toHaveProperty("src", "http://localhost/ETH.svg")
})

test("renders and show custom logo", () => {
    const availableNetworks = initBackgroundState.blankState?.availableNetworks!
    renderWithBackgroundProvider(<UseSelectedNetworkHookLogo />, {
        assignBlankState: {
            availableNetworks: {
                ...availableNetworks,
                GOERLI: {
                    ...availableNetworks.GOERLI,
                    iconUrls: ["custom_network_logo.svg"],
                },
            },
        },
    })
    const element = screen.getByRole("img")
    expect(element).toBeDefined()
    expect(element).toHaveProperty(
        "src",
        "http://localhost/custom_network_logo.svg"
    )
})
