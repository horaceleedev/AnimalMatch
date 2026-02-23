import { FC } from 'react';
import { Space, Tag, Tooltip } from 'antd';

type IndividualSelectOptionProps = {
  label: string;
  score: number | null | undefined;
  thumbnailUrl?: string;
};

const getSimilarityColor = (score: number) => {
  if (score >= 0.75) return 'green';
  if (score >= 0.6) return 'geekblue';
  if (score >= 0.5) return 'gold';
  return 'default';
};

const IndividualSelectOption: FC<IndividualSelectOptionProps> = ({
  label,
  score,
  thumbnailUrl,
}) => {
  const scoreLabel = typeof score === 'number' ? score.toFixed(3) : '—';

  return (
    <Space size="small">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }}
        />
      )}
      <span>{label}</span>
      {typeof score === 'number' && (
        <Tooltip title="Embedding similarity score">
          <Tag color={getSimilarityColor(score)}>AI similarity {scoreLabel}</Tag>
        </Tooltip>
      )}
    </Space>
  );
};

export default IndividualSelectOption;
