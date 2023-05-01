import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"

import { resetWallet } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import SeedImport from "../../components/setup/SeedImport"

const ResetPage = () => {
    const history: any = useOnMountHistory()
    const onSubmit = async (password: string, seedPhrase: string) => {
        const result = await resetWallet(password, seedPhrase)

        if (result) {
            history.push({ pathname: "/reset/done" })
        } else {
            throw new Error("Import Wallet failed")
        }
    }

    return (
        <PageLayout header maxWidth="max-w-lg">
            <span className="my-6 text-lg font-semibold">
                Reset your Wallet
            </span>
            <Divider />
            <div className="flex flex-col p-6 space-y-6">
                <div className="flex flex-col space-y-4">
                    <div className="w-full px-4 py-4 text-sm text-center text-red-500 bg-red-100 rounded">
                        <strong className="font-semibold">Warning: </strong>
                        <span>
                            If you decide to reset your wallet, your current
                            vault will be lost, i.e. all imported accounts and
                            added assets. You will not be able to access funds
                            outside of the imported seed phrase.
                        </span>
                    </div>
                </div>
            </div>

            <SeedImport buttonLabel="Reset wallet" action={onSubmit} />
        </PageLayout>
    )
}

export default ResetPage
