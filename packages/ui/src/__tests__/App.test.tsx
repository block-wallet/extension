import { render, screen } from "@testing-library/react"
import { MockPopup, MockTab } from "../mock/MockApp"
import { initBackgroundState } from "../context/background/backgroundContext"

// A mock is needed because ActivityList depends on an IntersectionObserver
// And it's not defined in the test environment
global.IntersectionObserver = class MockIntersection {
    root = null
    rootMargin = ""
    readonly thresholds = []

    disconnect() {}
    observe() {}
    takeRecords() {
        return []
    }
    unobserve() {}
}
test("Tab renders", () => {
    render(
        <MockTab location="/intro" assignBlankState={{ isOnboarded: false }} />
    )
    const blockWallet = screen.queryAllByText(/BlockWallet/i).length !== 0
    expect(blockWallet).toBeTruthy()
})

test("PopUp renders", () => {
    render(
        <MockPopup
            location="/home"
            assignBlankState={initBackgroundState.blankState}
        />
    )

    const privacy = screen.queryAllByText(/send/i).length !== 0
    console.log(privacy)
    expect(privacy).toBeTruthy()
})
