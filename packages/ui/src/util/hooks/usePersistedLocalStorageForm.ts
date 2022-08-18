import { useEffect } from "react"
import { FieldValues, useForm, UseFormProps, useWatch } from "react-hook-form"
import useLocalStorageState, {
    useLocalStorageStateOptions,
} from "./useLocalStorageState"

interface useLocalStorageProps<T> {
    key: string
    options?: useLocalStorageStateOptions<T>
}

const usePersistedLocalStorageForm = <
    TFields extends FieldValues = FieldValues,
    TContext extends object = object
>(
    localStorageProps: useLocalStorageProps<TFields>,
    formProps?: UseFormProps<TFields, TContext>
) => {
    const [persistedForm, setPersistedForm] = useLocalStorageState<any>(
        localStorageProps.key,
        {
            initialValue: formProps?.defaultValues,
            volatile: true,
            ...(localStorageProps.options || {}),
        }
    )
    const formReturn = useForm<TFields, TContext>({
        ...formProps,
        defaultValues: {
            ...(formProps?.defaultValues || {}),
            ...persistedForm,
        },
    })
    const watched = useWatch({ control: formReturn.control })
    useEffect(() => {
        setPersistedForm(watched)
    }, [watched, setPersistedForm])
    return formReturn
}

export default usePersistedLocalStorageForm
