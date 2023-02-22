const AppVersion = () => {
    const { VERSION, VERSION_NAME } = process.env

    return VERSION ? (
        <span className="text-gray-500">
            Version: v{[VERSION, VERSION_NAME].filter(Boolean).join(" - ")}
        </span>
    ) : (
        <span className="text-gray-500">DEVELOPMENT</span>
    )
}
export default AppVersion
