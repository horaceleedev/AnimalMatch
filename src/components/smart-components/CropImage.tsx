import React, { useState } from 'react';
import { Button, Image, Skeleton, Tooltip } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';

import { Crop } from '../../types.ts';
import { useCropsStore } from '../../DataStores.tsx';
import './CropImage.scss';

const FEATURED_COLOR = '#faad14';

type CropImageProps = {
  crop: Crop;
  // Render with antd's <Image> (zoom/preview), used by the detail view.
  preview?: boolean;
  // Show a skeleton placeholder until the image loads, used by the individuals grid.
  withSkeleton?: boolean;
  imageStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  // Applied to the underlying image element (e.g. hover effects).
  imageClassName?: string;
};

const CropImage: React.FC<CropImageProps> = ({
  crop,
  preview = false,
  withSkeleton = false,
  imageStyle,
  wrapperStyle,
  imageClassName,
}: CropImageProps) => {
  // CropImage is a smart component, so it owns the store interaction for
  // toggling the featured flag (only the is_featured field is ever updated).
  const updateCrop = useCropsStore((state) => state.update);
  const toggleFeatured = () => updateCrop(crop.id, { is_featured: !crop.is_featured });

  const [loaded, setLoaded] = useState(!withSkeleton);

  const scaledCropWidth = crop.height > 0
    ? Math.round((crop.width / crop.height) * 150)
    : 150; // fallback

  return (
    <div className="crop-image" style={{ position: 'relative', ...wrapperStyle }}>
      {withSkeleton && !loaded && (
        <Skeleton.Node active style={{ height: 150, width: scaledCropWidth }} />
      )}
      {preview ? (
        <Image src={crop.imageUrl} className={imageClassName} style={imageStyle} />
      ) : (
        <img
          src={crop.imageUrl}
          className={imageClassName}
          onLoad={withSkeleton ? () => setLoaded(true) : undefined}
          onError={withSkeleton ? () => setLoaded(true) : undefined}
          style={{
            display: 'block',
            ...imageStyle,
            ...(withSkeleton && !loaded ? { display: 'none' } : {}),
          }}
        />
      )}
      {loaded && (
        <Tooltip title={crop.is_featured ? 'Remove from featured' : 'Mark as featured'}>
          <Button
            className={`crop-featured-button${crop.is_featured ? ' is-featured' : ''}`}
            type="text"
            size="small"
            icon={
              crop.is_featured
                ? <StarFilled style={{ color: FEATURED_COLOR }} />
                : <StarOutlined style={{ color: 'white' }} />
            }
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: 'rgba(0,0,0,0.35)',
              borderRadius: 4,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFeatured();
            }}
          />
        </Tooltip>
      )}
    </div>
  );
};

export default CropImage;
