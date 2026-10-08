export const ACCESS_STORAGE_KEY = "opengrid_access";

export function hasAccess() {
  try {
    return window.sessionStorage.getItem(ACCESS_STORAGE_KEY) === "granted";
  } catch (error) {
    return false;
  }
}

export function grantAccess() {
  try {
    window.sessionStorage.setItem(ACCESS_STORAGE_KEY, "granted");
  } catch (error) {
    // storage unavailable — the board still loads for this session only
  }
}