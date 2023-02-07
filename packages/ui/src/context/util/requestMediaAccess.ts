import log from "loglevel"

/**
 * User gesture to request access to video
 * @returns boolean if user granted permissions to video
 */
export const requestMediaAccess = async () => {
    try {
        const mediaAccess = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
        })

        if (mediaAccess.getVideoTracks().length === 0) {
            log.error("Can't access webcam with extension")
            return false
        }

        return true
    } catch (error) {
        log.error("error ", error)
    }
}
