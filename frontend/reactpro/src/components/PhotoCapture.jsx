import React, { useState } from 'react';
import { capturePhoto } from '../utils/camera';
import { processImage } from '../utils/imageProcessor';
import { uploadClientPhotoFile } from '../api/photoApi';

/**
 * PhotoCapture Component
 *
 * Dual-mode UI for adding client photos:
 * 1. Upload from desktop (file picker)
 * 2. Capture from camera
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

  const handleCapture = async () => {
    resetMessages();

    try {
      setIsLoading(true);
      const capturedImage = await capturePhoto();
      setPreview(capturedImage);
    } catch (err) {
      setError(err.message || 'Camera capture failed. Please use upload instead.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCancel = () => {
    setPreview(null);
    resetMessages();

    const fileInput = document.getElementById('photo-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Shared button style
  const buttonStyle = (bgColor, disabled) => ({
    padding: '10px 16px',
    background: disabled ? '#6c757d' : bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  });

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Label */}
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
        Client Photo
      </label>

      {/* Help text */}
      <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
        Take a photo using your camera or upload from your computer.
      </p>

      {/* Action Buttons - Two column layout */}
      {!preview && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={handleCapture}
            disabled={isLoading}
            style={buttonStyle('#007bff', isLoading)}
            title="Use device camera to capture photo"
          >
            📷 Capture
          </button>

          <label style={{ cursor: 'pointer' }}>
            <input
              id="photo-file-input"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
              disabled={isLoading}
              style={{ display: 'none' }}
            />
            <span style={buttonStyle('#007bff', isLoading)}>
              📁 Upload
            </span>
          </label>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '13px', fontWeight: '500' }}>
            Photo Preview
          </p>
          <img
            src={preview}
            alt="Photo preview"
            style={{
              width: '100%',
              maxHeight: '250px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              objectFit: 'contain',
              marginBottom: '12px',
              backgroundColor: '#f5f5f5',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={buttonStyle('#28a745', isLoading)}
            >
              {isLoading ? 'Saving...' : '✓ Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              style={buttonStyle('#6c757d', isLoading)}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '10px 12px',
          borderRadius: '4px',
          fontSize: '13px',
          marginTop: '8px',
        }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '10px 12px',
          borderRadius: '4px',
          fontSize: '13px',
          marginTop: '8px',
        }}>
          {success}
        </div>
      )}
    </div>
  );
}
