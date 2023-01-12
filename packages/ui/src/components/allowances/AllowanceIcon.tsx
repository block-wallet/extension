import { Classes } from "../../styles"
import unknownTokenIcon from "../../assets/images/unknown_token.svg"

const AllowanceIcon = ({ name, logo }: { name?: string; logo?: string }) => {
    return (
        <div className={Classes.roundedFilledIcon}>
            {
                <img
                    src={logo || unknownTokenIcon}
                    onError={(e) => {
                        ;(e.target as any).onerror = null
                        ;(e.target as any).src = unknownTokenIcon
                    }}
                    alt={name || ""}
                    className="rounded-full"
                />
            }
        </div>
    )
}

export default AllowanceIcon
