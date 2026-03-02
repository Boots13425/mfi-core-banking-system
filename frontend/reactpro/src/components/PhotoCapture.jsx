import React, { useState } from 'react';
import { capturePhoto } from '../utils/camera';
import { processImage } from '../utils/imageProcessor';
import { uploadClientPhotoFile } from '../api/photoApi';
import './PhotoCapture.css';

/**
 * PhotoCapture Component
 *
 * Dual-mode UI for adding client photos:
 * 1. Upload from desktop (file picker)
 * 2. Capture from camera (currently placeholder, future SDK integration)
 *
 * Props:
 *   - clientId (required): Client ID for photo upload
 *   - onPhotoUploaded (optional): Callback after successful upload
 */
export default function PhotoCapture({ clientId, onPhotoUploaded }) {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  /**
   * Handle file selection from desktop
   */
  const handleFileUpload = async (evt) => {
    resetMessages();

    if (!evt.target.files || !evt.target.files[0]) {
      return;
    }

    const file = evt.target.files[0];

    try {
      setIsLoading(true);
      const processedImage = await processImage(file);
      setPreview(processedImage);
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle photo capture from camera
   */
  const handleCapture = async () => {
    resetMessages();

    try {
      setIsLoading(true);
      const capturedImage = await capturePhoto();
      setPreview(capturedImage);
      setSuccess('Photo captured. Click Submit to save.');
    } catch (err) {
      setError(
        err.message || 'Camera capture failed. Please use upload instead.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Submit the photo to the backend
   */
  const handleSubmit = async () => {
    if (!preview) {
      setError('No photo selected');
      return;
    }

    try {
      setIsLoading(true);
      resetMessages();

      // Convert data URL to File for upload
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], `client-photo-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Upload to backend
      const result = await uploadClientPhotoFile(clientId, file);

      setSuccess('Photo uploaded successfully!');
      setPreview(null);

      // Reset file input
      const fileInput = document.getElementById('photo-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      // Notify parent component
      if (onPhotoUploaded) {
        onPhotoUploaded(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel and clear preview
   */
  const handleCancel = () => {
    setPreview(null);
    resetMessages();

    const fileInput = document.getElementById('photo-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="photo-capture">
      <h2>Client Photo</h2>

      {/* Action Buttons */}
      <div className="photo-capture__actions">
        <button
          className="photo-capture__button photo-capture__button--primary"
          onClick={handleCapture}
          disabled={isLoading}
          title="Capture photo using camera"
        >
          📷 Capture Photo
        </button>

        <label className="photo-capture__file-label">
          <input
            id="photo-file-input"
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="photo-capture__file-input"
          />
          <span className="photo-capture__button photo-capture__button--primary">
            📁 Upload from Desktop
          </span>
        </label>
      </div>

      {/* Preview and Submit Section */}
      {preview && (
        <div className="photo-capture__preview-section">
          <h3>Preview</h3>
          <img
            src={preview}
            alt="Preview"
            className="photo-capture__preview-image"
          />

          <div className="photo-capture__preview-actions">
            <button
              className="photo-capture__button photo-capture__button--success"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Uploading...' : '✓ Submit'}
            </button>
            <button
              className="photo-capture__button photo-capture__button--cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="photo-capture__message photo-capture__message--error">
          {error}
        </div>
      )}

      {success && (
        <div className="photo-capture__message photo-capture__message--success">
          {success}
        </div>
      )}
    </div>
  );
}
