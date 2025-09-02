import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import TextInput from "../../components/input/TextInput"
import PasswordInput from "../../components/input/PasswordInput"
import LinkButton from "../../components/button/LinkButton"
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

  useEffect(() => {
    if (password && passwordConfirmation) {
      trigger("passwordConfirmation")
    }
  }, [password, passwordConfirmation, trigger])

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1)
    setImportError("")
    setTimeout(() => {
      handleSubmit(onSubmit)()
    }, 500)
  }

  const onSubmit = async (data: PrivateKeyImportFormData) => {
    if (passwordScore < 3) {
      return
    }

    setIsImporting(true)
    setImportError("")

    try {
      setStep('creating')

      await createWallet(data.password)

      setStep('importing')

      const privateKey = data.privateKey.startsWith("0x")
        ? data.privateKey
        : `0x${data.privateKey}`

      const accountInfo = await importAccountPrivateKey(
        { privateKey },
        "Imported Account"
      )

      await selectAccount(accountInfo.address)

      await completeSetup(true)

      setStep('done')

      history.push({ pathname: "/setup/done" })
    } catch (error: any) {
      console.error("Error importing account from private key:", error)

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
    <PageLayout
      screen
      className="w-full h-screen max-w-none shadow-none rounded-none relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 flex items-center justify-center"
    >
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-3 h-full flex flex-col justify-center">
        <div className="text-center mb-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-1">
            Import from Private Key
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Import a specific account using its private key
          </p>
        </div>

        <Divider />

        <div className="mt-3 w-full max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
              <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mx-auto flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0 1 21 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Import Private Key
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Import your account
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b lg:border-b-0 lg:border-r border-red-200 dark:border-red-800/50 p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-xs font-bold text-red-900 dark:text-red-100 mb-1">
                      Security Warning
                    </h3>
                    <p className="text-xs text-red-800 dark:text-red-200 leading-tight">
                      Never share your private key. Anyone with access can control your account.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="col-span-1 lg:col-span-2">
                <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Private Key
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <TextInput
                        appearance="outline"
                        placeholder="Enter your private key (with or without 0x prefix)"
                        {...register("privateKey")}
                        error={errors.privateKey?.message}
                        className="font-mono text-sm pr-12 py-3 min-h-[48px] leading-relaxed"
                      />
                      <div className="absolute right-3 top-4 pointer-events-none">
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 32 32">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 9.33a2.67 2.67 0 012.67 2.67m5.33 0a8 8 0 01-10.32 7.66L14.67 22.67H12v2.66H9.33v2.67H5.33a1.33 1.33 0 01-1.33-1.33v-3.45a1.33 1.33 0 01.39-.94l7.95-7.95A8 8 0 0128 12z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Set Wallet Password
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        id="acceptTOU"
                        {...register("acceptTOU")}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="acceptTOU" className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed cursor-pointer">
                        I have read and agree to the{" "}
                        <a
                          href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline hover:no-underline"
                        >
                          Terms of Use
                        </a>
                      </label>
                      {errors.acceptTOU?.message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {errors.acceptTOU.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {importError && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                          Import Error
                        </h3>
                        <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                          {importError}
                        </p>
                        {importError.includes("Connection to extension was interrupted") && retryAttempts < 3 && (
                          <button
                            onClick={handleRetry}
                            className="text-xs font-semibold text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline transition-colors duration-200"
                            type="button"
                          >
                            Try Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-row justify-between space-x-4">
                  <LinkButton
                    location="/setup/"
                    text="Back"
                    lite
                    disabled={isImporting}
                    classes="flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  />

                  <button
                    type="submit"
                    className="flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg min-w-[120px]"
                    disabled={!isValid || isImporting || (retryAttempts >= 3 && importError.includes("Connection to extension"))}
                  >
                    {isImporting ? (
                      <>
                        <Spinner size="16px" />
                        <span className="ml-2">{getStepMessage()}</span>
                      </>
                    ) : (
                      <>
                        <span>Import Account</span>
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        </div>

        <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-purple-400/10 dark:from-indigo-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
    </PageLayout>
  )
}

export default PrivateKeyImportPage
