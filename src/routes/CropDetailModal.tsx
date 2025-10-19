import React, { useState } from 'react'
import { useNavigate, useParams } from "react-router-dom";
import { useShallow } from 'zustand/react/shallow';
import { Modal } from "antd";

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
      title="Crop"
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