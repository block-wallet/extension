import { formatUrl } from "../../util/formatUrl"

export const DAppOrigin = ({
    iconURL,
    name,
}: {
    iconURL: string | null
    name: string
}) => {
    return name.length < 40 ? (
        <div className="px-6 py-2 flex flex-row items-center">
            <div className="flex flex-row items-center justify-center w-10 h-10 rounded-full bg-primary-grey-default">
                {iconURL && <img key={iconURL} alt="icon" src={iconURL} />}
            </div>
            <div className="flex flex-col text-sm font-semibold ml-4">
                {formatUrl(name)}
            </div>
        </div>
    ) : (
        <div
            className="pr-6 py-2 flex flex-row items-center text-sm font-semibold ml-4"
            style={{ lineBreak: "anywhere" }}
        >
            {formatUrl(name)}
        </div>
    )
}

export default DAppOrigin
