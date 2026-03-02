/**
 * Camera Module - Abstraction Layer for Photo Capture
 *
 * This module provides a pluggable interface for photo capture.
 * Uses native MediaDevices API for real camera access on supported devices.
 * Fallback: Returns placeholder if device doesn't support camera.
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
 * Capture a photo using device camera via MediaDevices API
 * Falls back to placeholder if camera unavailable
 *
 * @returns {Promise<string>} Resolves with base64 data URL
 */
export async function capturePhoto() {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Camera API not available. Using placeholder.');
        resolve(getPlaceholderImage());
        return;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } }
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', ''); // For iOS
      video.style.width = '100%';
      video.style.height = '100%';

      // Create modal container for camera preview
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.background = 'rgba(0,0,0,0.7)';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '10000';
      modal.style.padding = '20px';

      // Video container
      const videoContainer = document.createElement('div');
      videoContainer.style.width = '100%';
      videoContainer.style.maxWidth = '500px';
      videoContainer.style.height = 'auto';
      videoContainer.style.borderRadius = '4px';
      videoContainer.style.overflow = 'hidden';
      videoContainer.style.backgroundColor = '#000';
      videoContainer.style.border = '2px solid #ddd';

      videoContainer.appendChild(video);
      modal.appendChild(videoContainer);

      // Control buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.marginTop = '16px';
      buttonContainer.style.display = 'grid';
      buttonContainer.style.gridTemplateColumns = '1fr 1fr';
      buttonContainer.style.gap = '8px';
      buttonContainer.style.width = '100%';
      buttonContainer.style.maxWidth = '500px';

      // Capture button
      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📷 Capture';
      captureBtn.style.padding = '12px 16px';
      captureBtn.style.background = '#007bff';
      captureBtn.style.color = 'white';
      captureBtn.style.border = 'none';
      captureBtn.style.borderRadius = '4px';
      captureBtn.style.cursor = 'pointer';
      captureBtn.style.fontWeight = 'bold';
      captureBtn.style.fontSize = '14px';

      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕ Cancel';
      cancelBtn.style.padding = '12px 16px';
      cancelBtn.style.background = '#6c757d';
      cancelBtn.style.color = 'white';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontWeight = 'bold';
      cancelBtn.style.fontSize = '14px';

      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      modal.appendChild(buttonContainer);
      document.body.appendChild(modal);

      // Wait for video to load before capturing
      video.onloadedmetadata = () => {
        video.play();

        captureBtn.onclick = () => {
          // Create canvas and capture frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);

          // Convert canvas to base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

          // Stop stream and clean up
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);

          resolve(dataUrl);
        };

        cancelBtn.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);
          reject(new Error('Photo capture cancelled by user'));
        };
      };

      video.onerror = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
        reject(new Error('Failed to load video stream'));
      };
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please check browser permissions.'
        : err.name === 'NotFoundError'
        ? 'No camera device found on this device.'
        : `Camera error: ${err.message}`;
      reject(new Error(errorMsg));
    }
  });
}

/**
 * Check if camera is available on this device.
 *
 * @returns {boolean} True if camera is available
 */
export function isCameraAvailable() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
