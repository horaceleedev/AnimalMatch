import React, { useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShallow } from 'zustand/react/shallow';
import { Button, Modal, Space } from "antd";
import Icon from '@ant-design/icons';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useCropsStore } from "../DataStores.tsx";
import CropDetailView from '../components/CropDetailView.tsx';
import InnerModal from './InnerModal.tsx';
import { RecordDetailModalProps, RecordType } from '../types.ts';

const CropDetailModal: React.FC<RecordDetailModalProps> = ({
  id: cropIdFromProps, // if not provided, will get from useParams
  exitModal, // if not provided, will navigate back to /crops
}) => {
  const navigate = useNavigate();
  const { cropId: cropIdFromParams } = useParams<"cropId">();
  const cropId = cropIdFromProps ?? cropIdFromParams;
  console.log(cropId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    if (open === false) {
      // Once the modal is closed, exit using exitModal if provided,
      // otherwise navigate back to the /crops page
      if (exitModal) exitModal();
      else navigate('/crops');
    }
  };

  const [innerModalProps, setInnerModalProps] = useState<{ type?: RecordType; id?: string; }>({
    type: undefined,
    id: undefined,
  });

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
      <InnerModal {...innerModalProps} exitModal={() => setInnerModalProps({ type: undefined, id: undefined })} />
    </Modal>
  );
};

export default CropDetailModal;