/** Where the app lives, and the old address it moved from. */
export const APP_NAME = "Honest CV"
export const APP_URL = "https://cv.fetehadin.com"
export const OLD_HOSTS = ["cv-formatter-two.vercel.app"]

export function isOldHost(hostname: string): boolean {
  return OLD_HOSTS.includes(hostname)
}
