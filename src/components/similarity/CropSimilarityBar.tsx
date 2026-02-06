import { FC } from 'react';
import { Space } from 'antd';
import { Crop } from '../../types';
import { useCompareCrops } from '../../hooks/useCompareCrops';
import SimilarityMatchTags from './SimilarityMatchTags';

type CropSimilarityBarProps = {
  leftCrop?: Crop | null;
  rightCrop?: Crop | null;
};

const CropSimilarityBar: FC<CropSimilarityBarProps> = ({ leftCrop, rightCrop }) => {
  if (!leftCrop || !rightCrop) return null;

  const compareResult = useCompareCrops(leftCrop, rightCrop);

  return (
    <Space
      size={6}
      style={{
        position: 'absolute',
        bottom: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        boxShadow:
          '0px 1px 2px -2px rgba(0,0,0,0.16), 0px 3px 6px 0px rgba(0,0,0,0.12), 0px 5px 12px 4px rgba(0,0,0,0.09)',
        padding: '8px 12px',
        borderRadius: 10,
        background: 'white',
        zIndex: 1000,
      }}
    >
      <span>Crop similarity</span>
      <SimilarityMatchTags
        isLoading={compareResult.isLoading}
        error={compareResult.error}
        bestScore={compareResult.bestScore}
        avgTopK={compareResult.avgTopK}
        pairCount={compareResult.pairCount}
      />
    </Space>
  );
};

export default CropSimilarityBar;
