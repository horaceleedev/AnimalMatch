import { FC } from 'react';
import { Space } from 'antd';
import { Crop, Individual } from '../../types';
import SimilarityMatchTags from './SimilarityMatchTags';
import { useCompareCropToIndividual } from '../../hooks/useCompareCropToIndividual';

type CropToIndividualSimilarityBarProps = {
  crop?: Crop | null;
  individual?: Individual | null;
  crops: Crop[];
  individuals: Individual[];
};

const CropToIndividualSimilarityBar: FC<CropToIndividualSimilarityBarProps> = ({
  crop,
  individual,
  crops,
  individuals,
}) => {
  if (!crop || !individual) return null;

  const compareResult = useCompareCropToIndividual(
    crop,
    individual,
    crops,
    individuals
  );

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
      <span>Crop ↔ individual similarity</span>
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

export default CropToIndividualSimilarityBar;
