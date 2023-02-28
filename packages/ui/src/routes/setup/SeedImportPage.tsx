import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import SeedImport from "../../components/setup/SeedImport"
import { importWallet } from "../../context/commActions"
import { getQueryParameter } from "../../util/url"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

const SeedImportPage = () => {
    const history: any = useOnMountHistory()

    // if the onboarding is ready the user shoulnd't set the seedphrase again.
    useCheckUserIsOnboarded()

    const onSubmit = async (password: string, seedPhrase: string) => {
        const defaultNetwork = getQueryParameter("defaultNetwork")
        const result = await importWallet(
            password,
            seedPhrase,
            defaultNetwork ? defaultNetwork : undefined
        )

        if (result) {
            history.push({ pathname: "/setup/done" })
        } else {
            throw new Error("Importing wallet failed.")
        }
    }

    return (
        <PageLayout header maxWidth="max-w-lg">
            <span className="my-6 text-lg font-semibold font-title">
                Import an Account
            </span>
            <Divider />
            <div className="flex flex-col p-6 space-y-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col px-6 my-2 space-y-1">
                        <span className="text-sm leading-relaxed text-center text-gray-600">
                            Select the length of your seed phrase and enter it
                            to import your account.
                        </span>
                    </div>
                    <div className="w-full px-4 py-4 text-sm text-center text-secondary-red-default bg-red-100 rounded">
                        <strong className="font-bold">Warning: </strong>
                        <span>
                            Never disclose your seed phrase. Anyone asking for
                            your seed phrase is most likely trying to steal your
                            funds.
                        </span>
                    </div>
                </div>
            </div>
            <SeedImport buttonLabel="Import" action={onSubmit} />
        </PageLayout>
    )
}

export default SeedImportPage
