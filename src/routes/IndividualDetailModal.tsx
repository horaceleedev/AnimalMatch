import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, Space } from "antd";
import Icon from '@ant-design/icons';
import { intersection } from 'es-toolkit';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStoreWithCrops, useVideoStore } from "../DataStores.tsx";
import IndividualDetailView from '../components/IndividualDetailView.tsx';

const IndividualDetailModal: React.FC = () => {
  const navigate = useNavigate();
  const { individualId } = useParams<"individualId">();
  console.log(individualId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /individuals page when the modal is closed
    if (open === false) navigate('/individuals');
  };

  const { individuals, individualsUniqueValuesPerField: uniqueValuesPerField } = useIndividualsStoreWithCrops();
  const individual = individuals.find(x => x.id === individualId);

  const allVideos = useVideoStore((state) => state.processedRecords);
  const videosWithIndividual = useMemo(() => allVideos.filter(v => individual?.videos.includes(v.id)), [allVideos, individual]);
  const seenTogetherIndividuals = useMemo(
    () => individuals.filter(indiv => (indiv.id !== individual?.id) && intersection(indiv.videos, videosWithIndividual.map(x => x.id)).length > 0)
  , [individuals, videosWithIndividual]);
  
  if (!individual) {
    console.error(`Individual with id ${individualId} not found`);
    return <></>;
  }

  // TODO
  // add back button (to the left of the title)
  // disable closing by escape key
  return (
    <Modal
      title={
        <Space>
          {individual.name}
          <Link to="compare">
            <Button icon={<Icon component={Compare} />}>Open comparison view</Button>
          </Link>
        </Space>
      }
      open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
    >
      <IndividualDetailView individual={individual} seenTogetherIndividuals={seenTogetherIndividuals} videosWithIndividual={videosWithIndividual} uniqueValuesPerField={uniqueValuesPerField} />
    </Modal>
  );
};

export default IndividualDetailModal;