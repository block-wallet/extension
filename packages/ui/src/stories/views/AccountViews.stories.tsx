import React from "react"
import { Meta } from "@storybook/react"
import { MockPopup } from "../../mock/MockApp"
import { initBackgroundState } from "../../mock/MockBackgroundState"
import { ConnectedSiteAccountsLocationState } from "../../routes/settings/ConnectedSiteAccountsPage"

export const Accounts = () => (
    <MockPopup
        location={`/accounts`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const AddressBook = () => (
    <MockPopup
        location={`/settings/addressBook`}
        state={{}}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const CreateAccountPage = () => (
    <MockPopup
        location={`/accounts/create`}
        assignBlankState={initBackgroundState.blankState}
    />
)

export const ConnectedSites = () => (
    <MockPopup
        location={`/accounts/menu/connectedSites`}
        assignBlankState={{
            ...initBackgroundState.blankState,
            permissions: {
                "https://app.uniswap.org": {
                    accounts: ["0x5621C68f21852811E1fd6208fAAA0FC13A845fD4"],
                    activeAccount: "0x5621C68f21852811E1fd6208fAAA0FC13A845fD4",
                    origin: "https://app.uniswap.org",
                    data: {
                        iconURL:
                            "https://cryptologos.cc/logos/uniswap-uni-logo.png?v=010",
                        name: "Uniswap Interface",
                    },
                },
                "https://app.1inch.io": {
                    accounts: ["0x5621C68f21852811E1fd6208fAAA0FC13A845fD4"],
                    activeAccount: "0x5621C68f21852811E1fd6208fAAA0FC13A845fD4",
                    origin: "https://app.1inch.io",
                    data: {
                        iconURL:
                            "https://raw.githubusercontent.com/trustwallet/assets/master/dapps/1inch.exchange.png",
                        name: "1inch Dex",
                    },
                },
            },
        }}
    />
)

export const ConnectedSiteAccounts = () => (
    <MockPopup
        location={`/accounts/menu/connectedSites/accountList`}
        state={
            {
                origin: "https://app.uniswap.org",
            } as ConnectedSiteAccountsLocationState
        }
        assignBlankState={{
            ...initBackgroundState.blankState,
            permissions: {
                "https://app.uniswap.org": {
                    accounts: [
                        "0x5621C68f21852811E1fd6208fCCC0FC13A844fD2",
                        "0x5621C68f21852811E1fd6208fAAA0FC13A844fD3",
                    ],
                    activeAccount: "0x5621C68f21852811E1fd6208fAAA0FC13A844fD3",
                    origin: "https://app.uniswap.org",
                    data: {
                        iconURL:
                            "https://cryptologos.cc/logos/uniswap-uni-logo.png?v=010",
                        name: "Uniswap Interface",
                    },
                },
            },
        }}
    />
)

export default { title: "Account Views" } as Meta
