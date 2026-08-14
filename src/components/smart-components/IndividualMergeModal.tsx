import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { ArrowRightOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, App, Button, Modal, Tooltip, Typography } from "antd";
const { Text } = Typography;
import { useShallow } from 'zustand/react/shallow';
import { ClientResponseError } from 'pocketbase';

import { IndividualLinkButton } from './LinkButtons.tsx';
import { useCropsStore, useIndividualsStore } from '../../DataStores.tsx';
import type { Individual } from '../../types.ts';

interface IndividualMergeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  leftIndividual?: Individual;
  rightIndividual?: Individual;
}

// Coloured inline text
const sourceRef = <Text type="danger">Source</Text>;
const targetRef = <Text type="success">Target</Text>;

const IndividualMergeModal: React.FC<IndividualMergeModalProps> = ({
  isOpen,
  setIsOpen,
  leftIndividual,
  rightIndividual,
}) => {
  // Local swap state: by default the left individual is the source and the right one is the target.
  const [swapped, setSwapped] = useState(false);
  // Reset the direction whenever the modal is opened for a different pair of individuals.
  useEffect(() => {
    setSwapped(false);
  }, [leftIndividual?.id, rightIndividual?.id]);

  const { message } = App.useApp();
  const [isMerging, setIsMerging] = useState(false);
  const navigate = useNavigate();

  const updateCrop = useCropsStore((state) => state.update);
  const [updateIndividual, deleteIndividual] = useIndividualsStore(useShallow((state) => [state.update, state.delete]));

  if (!leftIndividual || !rightIndividual) {
    return null; // or some fallback UI
  }

  const source = swapped ? rightIndividual : leftIndividual;
  const target = swapped ? leftIndividual : rightIndividual;

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const handleMerge = async () => {
    setIsMerging(true);
    try {
      // Transfer crops from source to target
      for (const crop of source.crops) {
        await updateCrop(crop.id, { individual: target.id });
      }
      // Transfer video sightings from source to target
      await updateIndividual(target.id, {
        // append to list
        // https://pocketbase.io/docs/working-with-relations/#prependappend-to-multiple-relation
        'videos+': source.videos
      });

      // Delete the source individual
      await deleteIndividual(source.id);
    } catch (e) {
      let errorMessage = "Error merging individuals. Please try again later.";
      if (e instanceof ClientResponseError) {
        errorMessage = e.message;
      }
      message.error(errorMessage, 6);
      setIsMerging(false);
      return;
    }

    message.success('Individuals merged successfully');
    setIsMerging(false);
    setIsOpen(false);
    navigate(`/individuals/${target.id}`); // Navigate to the target individual's detail page after merge
  }

  return (
    <Modal
      title="Merge these individuals?"
      open={isOpen}
      onCancel={handleDismiss}
      centered={true}
      width={700}
      okText="Merge individuals"
      onOk={handleMerge}
      confirmLoading={isMerging}
    >
      {/* Visual summary of the merge direction, grouped in its own panel so it reads as one unit.
          A 2-row grid keeps the arrow vertically centered on the link buttons themselves,
          regardless of the caption text height below them. */}
      <div
        style={{
          display: 'grid',
          // Source/target columns share the flexible space equally (1fr each) so the
          // arrow column stays truly centered even when one name is much longer than the other.
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          justifyItems: 'center',
          columnGap: 16,
          rowGap: 8,
          margin: '12px 0 16px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 8,
        }}
      >
        <IndividualLinkButton id={source.id} />
        <ArrowRightOutlined style={{ fontSize: 18, color: 'rgba(0, 0, 0, 0.45)' }} />
        <IndividualLinkButton id={target.id} />

        <Text type="danger" style={{ fontSize: 12 }}>Source • will be deleted</Text>
        <Tooltip title="Swap source and target">
          <Button
            size="small"
            shape="circle"
            icon={<SwapOutlined />}
            onClick={() => setSwapped(s => !s)}
            aria-label="Swap source and target"
          />
        </Tooltip>
        <Text type="success" style={{ fontSize: 12 }}>Target • will be kept</Text>
      </div>

      <Text strong>What will happen:</Text>
      <ul style={{ margin: '8px 0 16px', paddingLeft: 20 }}>
        <li>
          <Text strong>Crops:</Text> all crops from the {sourceRef} will be transferred to the {targetRef}.
        </li>
        <li>
          <Text strong>Video sightings:</Text> the {targetRef}'s list of video sightings will be updated to include all videos from the {sourceRef}.
        </li>
        <li>
          <Text strong>Co-occurrences:</Text> the {targetRef} will inherit the {sourceRef}'s co-occurrences.
        </li>
        <li>
          <Text strong>Metadata:</Text> the {sourceRef}'s metadata (name, age, sex, notes, custom tags) will <Text strong>not</Text> be transferred. Update the {targetRef}'s metadata manually if needed.
        </li>
        <li>
          <Text strong>Deletion:</Text> the {sourceRef} will be permanently deleted.
        </li>
      </ul>

      <Alert type="warning" showIcon message="This action cannot be undone." />
    </Modal>
  );
};

export default IndividualMergeModal;
