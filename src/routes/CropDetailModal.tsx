import React, { useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShallow } from 'zustand/react/shallow';
import { Button, Modal, Space } from "antd";
import Icon from '@ant-design/icons';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useCropsStore } from "../DataStores.tsx";
import CropDetailView from '../components/CropDetailView.tsx';

const CropDetailModal: React.FC = () => {
  const navigate = useNavigate();
  const { cropId } = useParams<"cropId">();
  console.log(cropId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /crops page when the modal is closed
    if (open === false) navigate('/crops');
  };

  const [crops, updateCrop, uniqueValuesPerField] = useCropsStore(
    useShallow((state) => [state.processedRecords, state.update, state.uniqueValuesPerField])
  );
  const crop = crops.find(x => x.id === cropId);

  if (!crop) {
    console.error(`Crop with id ${cropId} not found`);
    return <></>;
  }

  // TODO
  // add back button (to the left of the title)
  // disable closing by escape key
  return (
    <Modal
      title={
        <Space>
          Crop
          <Link to={"/crops/compare/c/" + cropId}>
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
      <CropDetailView
        crop={crop}
        uniqueValuesPerField={uniqueValuesPerField}
        updateCrop={updateCrop}
      />
    </Modal>
  );
};

export default CropDetailModal;