import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import TextInput from "../../components/input/TextInput"
import PasswordInput from "../../components/input/PasswordInput"
import LinkButton from "../../components/button/LinkButton"
import { Classes, classnames } from "../../styles"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"
import {
  importAccountPrivateKey,
  selectAccount,
  createWallet,
  completeSetup
} from "../../context/commActions"
import Spinner from "../../components/spinner/Spinner"

const schema = yup.object().shape({
  privateKey: yup
    .string()
    .required("Please enter a private key")
    .matches(/^(0x)?[0-9a-fA-F]{64}$/, "Please enter a valid private key"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password should be at least 8 characters long")
    .matches(
      /(?=.*\d)(?=.*[a-z])/,
      "Password must contain at least one lowercase character and one digit"
    ),
  passwordConfirmation: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password"), null], "Passwords do not match"),
  acceptTOU: yup
    .bool()
    .required("You must accept the Terms of Use")
    .oneOf([true], "You must accept the Terms of Use")
})

type PrivateKeyImportFormData = {
  privateKey: string
  password: string
  passwordConfirmation: string
  acceptTOU: boolean
}

const PrivateKeyImportPage = () => {
  useCheckUserIsOnboarded()
  const history = useOnMountHistory()
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const [passwordScore, setPasswordScore] = useState(0)
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [step, setStep] = useState<'creating' | 'importing' | 'done'>('creating')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    trigger
  } = useForm<PrivateKeyImportFormData>({
    resolver: yupResolver(schema),
    mode: "onChange"
  })

  const password = watch("password")
  const passwordConfirmation = watch("passwordConfirmation")

  // Trigger validation for password confirmation when password changes
  useEffect(() => {
    if (password && passwordConfirmation) {
      trigger("passwordConfirmation")
    }
  }, [password, passwordConfirmation, trigger])

  // Function to handle retrying the import on port disconnection
  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1)
    setImportError("")
    // Wait for 500ms to ensure connection is reestablished
    setTimeout(() => {
      handleSubmit(onSubmit)()
    }, 500)
  }

  const onSubmit = async (data: PrivateKeyImportFormData) => {
    // Check password strength
    if (passwordScore < 3) {
      return
    }

    setIsImporting(true)
    setImportError("")

    try {
      setStep('creating')

      // First, create a wallet with the provided password
      await createWallet(data.password)

      setStep('importing')

      // Ensure private key has 0x prefix
      const privateKey = data.privateKey.startsWith("0x")
        ? data.privateKey
        : `0x${data.privateKey}`

      // Then import the account
      const accountInfo = await importAccountPrivateKey(
        { privateKey },
        "Imported Account" // Default name
      )

      // Select the newly imported account
      await selectAccount(accountInfo.address)

      // Mark setup as complete
      await completeSetup(true)

      setStep('done')

      // Redirect to setup done page
      history.push({ pathname: "/setup/done" })
    } catch (error: any) {
      console.error("Error importing account from private key:", error)

      // Check if this is a port disconnection error
      if (error?.message && error.message.includes("disconnected port object")) {
        setImportError("Connection to extension was interrupted. Please try again.")
      } else if (error?.message && error.message.toLowerCase().includes("duplicate")) {
        setImportError("Account already exists.")
      } else {
        setImportError(
          error?.message || "Failed to import account from private key."
        )
      }
    } finally {
      setIsImporting(false)
    }
  }

  const getStepMessage = () => {
    switch (step) {
      case 'creating':
        return "Creating wallet...";
      case 'importing':
        return "Importing private key...";
      case 'done':
        return "Import completed!";
      default:
        return "Importing...";
    }
  }

  return (
    <PageLayout header maxWidth="max-w-lg">
      <span className="my-6 text-lg font-semibold">
        Import from Private Key
      </span>
      <Divider />
      <form
        className="flex flex-col w-full text-primary-grey-dark"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex flex-col p-6 space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col px-6 my-2 space-y-1">
              <span className="text-sm leading-relaxed text-center text-primary-grey-dark">
                Enter your private key and set a password to import your account.
              </span>
            </div>
            <div className="w-full px-4 py-4 text-sm text-center text-secondary-red-default bg-red-100 rounded">
              <strong className="font-semibold">Warning: </strong>
              <span>
                Never disclose your private key. Anyone with your private key can access your account and steal your funds.
              </span>
            </div>
          </div>

          {/* Private Key Input */}
          <div className="flex flex-col space-y-2">
            <TextInput
              appearance="outline"
              label="Private Key"
              placeholder="Enter your private key (with or without 0x prefix)"
              {...register("privateKey")}
              error={errors.privateKey?.message}
            />
          </div>

          {/* Password Inputs */}
          <div className="flex flex-col space-y-4">
            <PasswordInput
              label="New Password"
              placeholder="Enter New Password"
              {...register("password")}
              error={errors.password?.message}
              strengthBar={true}
              setPasswordScore={setPasswordScore}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm New Password"
              {...register("passwordConfirmation")}
              error={errors.passwordConfirmation?.message}
            />
          </div>

          {/* Terms of Use Checkbox */}
          <div className="flex flex-col space-y-1">
            <div className="flex flex-row items-center space-x-2">
              <input
                type="checkbox"
                className={Classes.checkbox}
                id="acceptTOU"
                {...register("acceptTOU")}
              />
              <label htmlFor="acceptTOU" className="text-xs">
                I have read and agree to the{" "}
                <a
                  href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-blue-default hover:underline"
                >
                  Terms of Use
                </a>
              </label>
            </div>
            <span className="text-xs text-red-500 h-4">
              {errors.acceptTOU?.message || <>&nbsp;</>}
            </span>
          </div>

          {/* Display Import Error */}
          {importError && (
            <div className="w-full p-3 text-sm text-center text-red-700 bg-red-100 border border-red-300 rounded">
              <div className="flex flex-col">
                <strong>Import Error:</strong> {importError}
                {importError.includes("Connection to extension was interrupted") && retryAttempts < 3 && (
                  <button
                    onClick={handleRetry}
                    className="text-red-700 underline font-medium mt-2 self-end"
                    type="button"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider and Action Buttons */}
        <Divider />
        <div className="flex flex-row p-6 space-x-4">
          <LinkButton
            location="/setup/"
            text="Back"
            lite
            disabled={isImporting}
          />
          <button
            type="submit"
            className={classnames(
              Classes.button,
              "w-1/2 font-semibold border-2 border-primary-blue-default",
              (!isValid || isImporting) && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isValid || isImporting || (retryAttempts >= 3 && importError.includes("Connection to extension"))}
          >
            {isImporting ? (
              <div className="flex items-center justify-center space-x-2">
                <Spinner size="16px" />
                <span className="text-sm">{getStepMessage()}</span>
              </div>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </form>
    </PageLayout>
  )
}

export default PrivateKeyImportPage
