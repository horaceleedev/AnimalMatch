import React, { useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, Space } from "antd";
import Icon from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStoreWithCrops, useVideoStore } from "../DataStores.tsx";
import VideoDetailView from '../components/VideoDetailView.tsx';
import "./VideoDetailModal.scss";

const VideoDetailModal: React.FC = () => {
  const navigate = useNavigate();
  const { videoId } = useParams<"videoId">();
  console.log(videoId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /videos page when the modal is closed
    if (open === false) navigate('/videos');
  };

  const [videos, updateVideo, uniqueValuesPerField, uniqueLocations] = useVideoStore(
    useShallow((state) => [state.processedRecords, state.update, state.uniqueValuesPerField, state.extra.uniqueLocations])
  );
  const video = videos.find(x => x.id === videoId);

  const { individuals } = useIndividualsStoreWithCrops();
  const individualsInVideo = video ? (individuals.filter(x => x.videos.includes(video.id)) || []) : [];

  if (!video) {
    console.error(`Video with id ${videoId} not found`);
    return <></>;
  }
  
  // TODO
  // add back button (to the left of the title)
  // disable closing by escape key
  return (
    <Modal
      title={
        <Space>
          {video.filename}
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
      <VideoDetailView
        video={video}
        individualsInVideo={individualsInVideo}
        uniqueValuesPerField={uniqueValuesPerField}
        uniqueLocations={uniqueLocations}
        updateVideo={updateVideo}
      />
    </Modal>
  );
};

export default VideoDetailModal;