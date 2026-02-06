import { FC } from 'react';
import { Tag, Tooltip } from 'antd';

type SimilarityMatchTagsProps = {
  isLoading: boolean;
  error: string | null;
  bestScore: number | null;
  avgTopK: number | null;
  pairCount?: number | null;
};

const SimilarityMatchTags: FC<SimilarityMatchTagsProps> = ({
  isLoading,
  error,
  bestScore,
  avgTopK,
  pairCount,
}) => {
  if (isLoading) {
    return <Tag>Computing similarity…</Tag>;
  }

  if (error) {
    return <Tag color="red">Similarity unavailable</Tag>;
  }

  if (bestScore === null) {
    return <Tag>No face crops to compare</Tag>;
  }

  const safePairCount = typeof pairCount === 'number' ? pairCount : null;
  const bestTooltip = safePairCount !== null
    ? `Highest similarity from ${safePairCount} face-pair comparisons`
    : 'Highest similarity across face-pair comparisons';
  const avgTooltip = safePairCount !== null
    ? `Average of top matches from ${safePairCount} face-pair comparisons`
    : 'Average of top matches across face-pair comparisons';

  return (
    <>
      <Tooltip title={bestTooltip}>
        <Tag color="blue">AI best {bestScore.toFixed(3)}</Tag>
      </Tooltip>
      <Tooltip title={avgTooltip}>
        <Tag color="geekblue">AI avg {avgTopK?.toFixed(3)}</Tag>
      </Tooltip>
    </>
  );
};

export default SimilarityMatchTags;
