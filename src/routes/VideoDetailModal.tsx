import React, { useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Flex, Modal } from "antd";
import Icon from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStoreWithCrops, useVideosStoreWithUsers } from "../DataStores.tsx";
import VideoDetailView from '../components/detail-views/VideoDetailView.tsx';
import { RecordDetailModalProps, RecordType } from '../types.ts';
import InnerModal from './InnerModal.tsx';
import RecordActionsButton from '../components/misc/RecordActionsButton.tsx';
import "./VideoDetailModal.scss";

const VideoDetailModal: React.FC<RecordDetailModalProps> = ({
  id: videoIdFromProps, // if not provided, will get from useParams
  exitModal, // if not provided, will navigate back to /videos
}) => {
  const navigate = useNavigate();
  const { videoId: videoIdFromParams } = useParams<"videoId">();
  const videoId = videoIdFromProps ?? videoIdFromParams;
  console.log(videoId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    if (open === false) {
      // Once the modal is closed, exit using exitModal if provided,
      // otherwise navigate back to the /videos page
      if (exitModal) exitModal();
      else navigate('/videos');
    }
  };

  const [innerModalProps, setInnerModalProps] = useState<{ type?: RecordType; id?: string; }>({
    type: undefined,
    id: undefined,
  });

  const {
    videos,
    updateVideo,
    deleteVideo,
    videosUniqueValuesPerField: uniqueValuesPerField,
    uniqueVideoLocations: uniqueLocations
  } = useVideosStoreWithUsers();
  const video = videos.find(x => x.id === videoId);

  const { individuals } = useIndividualsStoreWithCrops();
  const individualsInVideo = video ? (individuals.filter(x => x.videos.includes(video.id)) || []) : [];
  
  // TODO
  // add back button (to the left of the title)
  // disable closing by escape key
  return (
    <Modal
      title={
        <Flex gap="small" align="center" justify="space-between" style={{height: 24, marginRight: "32px"}}>
          {video?.filename ?? "Unknown video"}
          {/* <Link to={"/videos/compare/v/" + videoId}>
            <Button icon={<Icon component={Compare} />}>Open comparison view</Button>
          </Link> */}
          <RecordActionsButton
            recordType="video"
            recordId={videoId!}
            deleteFunction={deleteVideo}
            onDelete={handleDismiss}
          />
        </Flex>
      }
      open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
      className="video-detail-modal"
    >
      {
        video ?
        <VideoDetailView
          video={video}
          individualsInVideo={individualsInVideo}
          uniqueValuesPerField={uniqueValuesPerField}
          uniqueLocations={uniqueLocations}
          openModal={(type, id) => setInnerModalProps({ type, id })}
          updateVideo={updateVideo}
        />
        :
        "Video not found"
      }
      <InnerModal {...innerModalProps} exitModal={() => setInnerModalProps({ type: undefined, id: undefined })} />
    </Modal>
  );
};

export default VideoDetailModal;