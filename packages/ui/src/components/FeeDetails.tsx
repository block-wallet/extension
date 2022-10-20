import { FC } from "react"
import { AiFillInfoCircle } from "react-icons/ai"
import GenericTooltip from "./label/GenericTooltip"

interface FeeDetailsProps {
    summary: string
    details?: string | React.ReactElement
}

const FeeDetails: FC<FeeDetailsProps> = ({ summary, details }) => {
    return (
        <div className="flex items-center pt-2">
            <p className="text-xs text-gray-600 pt-0.5 mr-1">{summary}</p>
            {details && (
                <GenericTooltip
                    divFull={false}
                    content={details}
                    top
                    className="!w-60 !break-word !whitespace-normal !-translate-x-20 !opacity-100 !border"
                >
                    <AiFillInfoCircle
                        size={18}
                        className="cursor-pointer text-primary-200 hover:text-primary-300"
                    />
                </GenericTooltip>
            )}
        </div>
    )
}

export default FeeDetails
