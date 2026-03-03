import React, { useState } from 'react';
import { Skeleton } from 'antd';

import type { CSSProperties } from 'react';
import type { Crop } from '../../types.ts';

interface CropWithSkeletonProps {
  crop: Crop;
  imageHeight: number;
  imageStyle?: CSSProperties;
};

const CropWithSkeleton: React.FC<CropWithSkeletonProps> = ({ crop, imageHeight, imageStyle }) => {
  const [loaded, setLoaded] = useState(false);
  const scaledCropWidth = crop.height > 0
    ? Math.round((crop.width / crop.height) * imageHeight)
    : imageHeight; // fallback

  return (
    <div>
      {!loaded && (
        <Skeleton.Node active style={{height: imageHeight, width: scaledCropWidth}} />
      )}
      <img
        src={crop.imageUrl}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={{display: loaded ? 'block' : 'none', height: imageHeight, ...imageStyle}}
      />
    </div>
  );
};

export default CropWithSkeleton;
