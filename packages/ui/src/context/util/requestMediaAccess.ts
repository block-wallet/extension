import log from "loglevel"

/**
 * User gesture to request access to video
 * @returns boolean if user granted permissions to video
 */
export const requestMediaAccess = () => {
    return navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((mediaAccess) => {
            return mediaAccess.getVideoTracks().length > 0
        })
        .catch((error) => {
            log.error("error ", error)
            return false
        })
}
