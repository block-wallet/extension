import { Meta } from "@storybook/react"

import { Classes } from "../styles"
import TextInput from "../components/input/TextInput"

export const Checkbox = () => (
    <div className="flex flex-row items-center space-x-4">
        <input type="checkbox" className={Classes.checkbox} checked />
        <input type="checkbox" className={Classes.checkbox} />
    </div>
)

export const CheckboxAlt = () => (
    <div className="flex flex-row items-center space-x-4">
        <input type="checkbox" className={Classes.checkboxAlt} checked />
        <input type="checkbox" className={Classes.checkboxAlt} />
    </div>
)

export const TextInputBlue = () => (
    <TextInput appearance="blue-section" placeholder="0 ETH" />
)
export const TextInputOutline = () => (
    <TextInput appearance="outline" placeholder="Account 2" />
)

export default { title: "Input" } as Meta
