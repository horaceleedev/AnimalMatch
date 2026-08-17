import React, { useState } from 'react';
import { App, Button, Image, Skeleton, Tooltip } from 'antd';
import { PushpinFilled, PushpinOutlined } from '@ant-design/icons';
import { ClientResponseError } from 'pocketbase';

import { Crop } from '../../types.ts';
import { useCropsStore } from '../../DataStores.tsx';
import { PINNED_COLOR } from '../../constants.ts';
import './CropImage.scss';

type CropImageProps = {
  crop: Crop;
  // Render with antd's <Image> (zoom/preview), used by the detail view.
  preview?: boolean;
  // Show a skeleton placeholder until the image loads, used by the individuals grid.
  withSkeleton?: boolean;
  // Height of the skeleton placeholder; should match the rendered image height.
  skeletonHeight?: number;
  imageStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  // Applied to the underlying image element (e.g. hover effects).
  imageClassName?: string;
  // Show the pin toggle, off by default.
  showPinButton?: boolean;
};

const CropImage: React.FC<CropImageProps> = ({
  crop,
  preview = false,
  withSkeleton = false,
  skeletonHeight = 150,
  imageStyle,
  wrapperStyle,
  imageClassName,
  showPinButton = false,
}: CropImageProps) => {
  const { message } = App.useApp();

  // CropImage is a smart component, so it owns the store interaction for
  // toggling the pinned flag (only the is_pinned field is ever updated).
  const updateCrop = useCropsStore((state) => state.update);
  const [isPinning, setIsPinning] = useState(false);

  const togglePinned = async () => {
    setIsPinning(true);
    try {
      await updateCrop(crop.id, { is_pinned: !crop.is_pinned });
    } catch (e) {
      // Clicking several pins in quick succession makes PocketBase auto-cancel the
      // earlier requests, which isn't a failure worth reporting to the user.
      if (!(e instanceof ClientResponseError && e.isAbort)) {
        let errorMessage = `Unable to ${crop.is_pinned ? 'unpin' : 'pin'} this crop. Please try again later.`;
        if (e instanceof ClientResponseError) {
          errorMessage = e.message;
        }
        message.error(errorMessage, 10);
      }
    }
    setIsPinning(false);
  };

  const [loaded, setLoaded] = useState(!withSkeleton);

  const scaledCropWidth = crop.height > 0
    ? Math.round((crop.width / crop.height) * skeletonHeight)
    : skeletonHeight; // fallback

  return (
    <div className="crop-image" style={{ position: 'relative', ...wrapperStyle }}>
      {withSkeleton && !loaded && (
        <Skeleton.Node active style={{ height: skeletonHeight, width: scaledCropWidth }} />
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
      {showPinButton && loaded && (
        <Tooltip title={crop.is_pinned ? 'Unpin crop' : 'Pin crop'}>
          <Button
            className="crop-pin-button"
            aria-label={crop.is_pinned ? 'Unpin crop' : 'Pin crop'}
            type="text"
            size="small"
            disabled={isPinning}
            icon={
              crop.is_pinned
                ? <PushpinFilled style={{ color: PINNED_COLOR }} />
                : <PushpinOutlined style={{ color: 'white' }} />
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
              togglePinned();
            }}
          />
        </Tooltip>
      )}
    </div>
  );
};

export default CropImage;
