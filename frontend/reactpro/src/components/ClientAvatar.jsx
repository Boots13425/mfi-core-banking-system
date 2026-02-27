import React from 'react';

/**
 * Render a client photo thumbnail.  Clicking the image will open the full
 * sized version in a new tab if `onClick` is provided.
 *
 * Props:
 *   - photoUrl: string | null/undefined; absolute or relative URL of image
 *   - name: optional string used for alt text
 *   - size: pixel width/height (default 40)
 *   - onClick: function invoked when avatar is clicked
 */
const ClientAvatar = ({ photoUrl, name, size = 40, onClick }) => {
  const style = {
    width: size,
    height: size,
    objectFit: 'cover',
    borderRadius: '50%',
    display: 'inline-block',
    verticalAlign: 'middle',
    cursor: onClick ? 'pointer' : 'default',
    background: '#eee',
  };

  if (!photoUrl) {
    // simple circle placeholder
    return <div style={style} />;
  }

  return (
    <img
      src={photoUrl}
      alt={name || 'Client photo'}
      style={style}
      loading="lazy"
      onClick={onClick}
    />
  );
};

export default ClientAvatar;
