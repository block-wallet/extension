const AppVersion = () =>
    process.env.VERSION ? (
        <span className="text-primary-grey-dark">
            Version: v{process.env.VERSION}
        </span>
    ) : (
        <span className="text-primary-grey-dark">DEVELOPMENT</span>
    )

export default AppVersion
