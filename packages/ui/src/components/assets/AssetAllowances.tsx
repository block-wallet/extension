import { useOnMountHistory } from "../../context/hooks/useOnMount"
import AllowanceItem from "../allowances/AllowanceItem"
import useTokenAllowances from "../../context/hooks/useTokenAllowances"

const AssetAllowances = () => {
    const history = useOnMountHistory()
    const tokenAddress: string = history.location.state.address

    const { token, allowances } = useTokenAllowances(tokenAddress)!

    return (
        <>
            {allowances?.length > 0 ? (
                allowances.map((spenderAllowance) => (
                    <>
                        <AllowanceItem
                            allowance={spenderAllowance[1]}
                            token={token}
                            spender={{
                                name: "spenderName",
                                address: spenderAllowance[0],
                                logo: "",
                            }}
                            showToken={false}
                        />
                        <hr />
                    </>
                ))
            ) : (
                <span className="text-sm text-gray-500 pt-4 mx-auto">
                    You have no allowances for this token.
                </span>
            )}
        </>
    )
}

export default AssetAllowances
