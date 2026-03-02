/**
 * Camera Module - Abstraction Layer for Photo Capture
 *
 * This module provides a pluggable interface for photo capture.
 * Currently: Returns a placeholder image for testing
 * Future: Can be swapped with real camera SDK/API without changing other code
 *
 * Guarantees:
 * - Returns a Promise that resolves to a base64 data URL
 * - Rejects with an error message if capture fails
 * - Can be used interchangeably with file uploads in the rest of the app
 */

/**
 * Generate a placeholder test image (small PNG)
 * @returns {string} Base64 data URL of a placeholder image
 */
function getPlaceholderImage() {
  // 1x1 blue pixel PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
}

/**
 * Capture a photo. Currently returns a placeholder; will be replaced with real SDK.
 *
 * @returns {Promise<string>} Resolves with base64 data URL
 */
export async function capturePhoto() {
  return new Promise((resolve, reject) => {
    try {
      const placeholder = getPlaceholderImage();
      resolve(placeholder);
    } catch (err) {
      reject(new Error('Photo capture failed: ' + err.message));
    }
  });
}

/**
 * Check if camera is available on this device.
 * Currently always returns true (placeholder can always be used).
 *
 * @returns {boolean} True if camera is available
 */
export function isCameraAvailable() {
  // Placeholder: always true. When implementing real camera SDK,
  // check navigator.mediaDevices or specific device APIs.
  return true;
}
