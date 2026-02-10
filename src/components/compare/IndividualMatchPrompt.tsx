import { FC } from 'react';
import { Button, Input, Modal, Space } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Crop, Individual } from '../../types';
import { useCompareIndividuals } from '../../hooks/useCompareIndividuals';
import SimilarityMatchTags from '../similarity/SimilarityMatchTags';

const { TextArea } = Input;

type IndividualMatchPromptProps = {
  leftIndividual?: Individual | null;
  rightIndividual?: Individual | null;
  crops: Crop[];
  inline?: boolean;
};

const IndividualMatchPrompt: FC<IndividualMatchPromptProps> = ({
  leftIndividual,
  rightIndividual,
  crops,
  inline = false,
}) => {
  if (!leftIndividual || !rightIndividual) return null;

  const individualCompareResult = useCompareIndividuals(
    leftIndividual,
    rightIndividual,
    crops
  );

  const showSameIndividualConfirm = () => {
    // TODO:
    // - check if age, sex match before merging
    // - determine which individual to merge into the other
    // - figure out what to do metadata when merging
    Modal.confirm({
      title: 'Do you want to merge these two individuals?',
      content: 'This action cannot be undone.',
      onOk: () => {
        return new Promise((resolve, reject) => {
          setTimeout(Math.random() > 0.5 ? resolve : reject, 1000);
        }).catch(() => console.log('Oops errors!'));
      },
      onCancel: () => {},
    });
  };

  const showDifferentIndividualConfirm = () => {
    Modal.confirm({
      title: 'Mark as different individuals',
      icon: <></>,
      content: (
        <>
          <TextArea
            placeholder="Write an optional note to explain why these two individuals are different"
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </>
      ),
      onOk: () => {
        return new Promise((resolve, reject) => {
          setTimeout(Math.random() > 0.5 ? resolve : reject, 1000);
        }).catch(() => console.log('Oops errors!'));
      },
      onCancel: () => {},
    });
  };

  const content = (
    <Space>
      <span>Are these two individuals the same?</span>
      <Space size={6}>
        <SimilarityMatchTags
          isLoading={individualCompareResult.isLoading}
          error={individualCompareResult.error}
          bestScore={individualCompareResult.bestScore}
          avgTopK={individualCompareResult.avgTopK}
          pairCount={individualCompareResult.pairCount}
        />
      </Space>
      <Button onClick={showSameIndividualConfirm} icon={<CheckOutlined />} type="primary">
        Same individual
      </Button>
      <Button onClick={showDifferentIndividualConfirm} icon={<CloseOutlined />} type="primary" danger>
        Different individual
      </Button>
    </Space>
  );

  if (inline) return content;

  return (
    <Space
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
      {content}
    </Space>
  );
};

export default IndividualMatchPrompt;
