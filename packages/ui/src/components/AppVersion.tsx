const AppVersion = () =>
    process.env.VERSION ? (
        <span className="text-gray-500">Version: v{process.env.VERSION}</span>
    ) : (
        <span className="text-gray-500">DEVELOPMENT</span>
    )

export default AppVersion
