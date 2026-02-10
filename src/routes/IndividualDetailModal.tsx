import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Flex, Modal } from "antd";
import Icon from '@ant-design/icons';
import { intersection } from 'es-toolkit';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStoreWithCrops, useVideoStore } from "../DataStores.tsx";
import IndividualDetailView from '../components/detail-views/IndividualDetailView.tsx';
import { getUniqueLocationsFromIndividuals } from '../utils/utils.ts';
import { RecordDetailModalProps, RecordType } from '../types.ts';
import InnerModal from './InnerModal.tsx';
import RecordActionsButton from '../components/ui/RecordActionsButton.tsx';
import "./IndividualDetailModal.scss";


const IndividualDetailModal: React.FC<RecordDetailModalProps> = ({
  id: individualIdFromProps, // if not provided, will get from useParams
  exitModal, // if not provided, will navigate back to /individuals
}) => {
  const navigate = useNavigate();
  const { individualId: individualIdFromParams } = useParams<"individualId">();
  const individualId = individualIdFromProps ?? individualIdFromParams;
  console.log(individualId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    if (open === false) {
      // Once the modal is closed, exit using exitModal if provided,
      // otherwise navigate back to the /individuals page
      if (exitModal) exitModal();
      else navigate('/individuals');
    }
  };

  const [innerModalProps, setInnerModalProps] = useState<{ type?: RecordType; id?: string; }>({
    type: undefined,
    id: undefined,
  });

  const { individuals, updateIndividual, deleteIndividual, individualsUniqueValuesPerField, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
  const individual = individuals.find(x => x.id === individualId);

  const allVideos = useVideoStore((state) => state.processedRecords);
  const videosWithIndividual = useMemo(() => allVideos.filter(v => individual?.videos.includes(v.id)), [allVideos, individual]);
  const seenTogetherIndividuals = useMemo(
    () => individuals.filter(indiv => (indiv.id !== individual?.id) && intersection(indiv.videos, videosWithIndividual.map(x => x.id)).length > 0)
  , [individuals, videosWithIndividual]);
  // TODO figure out if I should compute this (uniqueIndividualLocations) here or inside DataStores.tsx
  const uniqueIndividualLocations = useMemo(() => {
    return getUniqueLocationsFromIndividuals(individuals, allVideos);
  }, [individuals, allVideos]);

  // TODO
  // add back button (to the left of the title)
  // disable closing by escape key
  return (
    <Modal
      title={
        <Flex gap="small" align="center" justify="space-between" style={{height: 24, marginRight: "32px"}}>
          {individual?.name ?? "Unknown individual"}
          {/* <Link to={"/individuals/compare/i/" + individualId}>
            <Button icon={<Icon component={Compare} />}>Open comparison view</Button>
          </Link> */}
          <RecordActionsButton
            recordType="individual"
            recordId={individualId!}
            deleteFunction={deleteIndividual}
            onDelete={handleDismiss}
          />
        </Flex>
      }
      open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
      className="individual-detail-modal"
    >
      {
        individual ?
        <IndividualDetailView
          individual={individual} 
          seenTogetherIndividuals={seenTogetherIndividuals}
          videosWithIndividual={videosWithIndividual}
          uniqueValuesPerField={individualsUniqueValuesPerField}
          cropsUniqueValuesPerField={cropsUniqueValuesPerField}
          uniqueLocations={uniqueIndividualLocations}
          openModal={(type, id) => setInnerModalProps({ type, id })}
          updateIndividual={updateIndividual}
        />
        :
        "Individual not found"
      }
      <InnerModal {...innerModalProps} exitModal={() => setInnerModalProps({ type: undefined, id: undefined })} />
    </Modal>
  );
};

export default IndividualDetailModal;