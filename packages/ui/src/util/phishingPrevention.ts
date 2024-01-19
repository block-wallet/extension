import { v4 as createUuid } from "uuid"
import { generatePhishingPrevention } from "@block-wallet/phishing-prevention"
import { postSlackMessage } from "../context/commActions"

/**
 * generatePhishingPreventionBase64
 *
 * Generates and stores a deterministically generated
 * base64 image string to be used as an anti phishing measure.
 *
 * The function temporarly renders a canvas element in the DOM using a
 * generative art script and removes it immediately after the image data is obtained.
 *
 * @param uuid An uuid to be used as a seed for the anti phishing image generation.
 * Creates a random one if it isn't provided
 */
export const generatePhishingPreventionBase64 = async (
    customUuid?: string
): Promise<string> => {
    const uuid = customUuid || createUuid()
    try {
        return generatePhishingPrevention(uuid, 175)
    } catch (e) {
        const errorMessage = "Error generating the phishing prevention image"
        postSlackMessage(errorMessage, e, "File: phishingPrevention")
        return Promise.reject(errorMessage)
    }
}
