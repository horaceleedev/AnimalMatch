import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, Space } from "antd";
import Icon from '@ant-design/icons';
import { intersection } from 'es-toolkit';

import { useVideoStore } from "../DataStores.tsx";
import VideoAnnotator from '../components/VideoAnnotator/VideoAnnotator.tsx';

const VideoAnnotatorModal: React.FC = () => {
  const navigate = useNavigate();
  const { videoId } = useParams<"videoId">();
  console.log(videoId)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /videos/:videoId page when the modal is closed
    if (open === false) navigate('/videos/'+videoId);
  };
  
  const videos = useVideoStore((state) => state.videos);
  const video = videos.find(x => x.id === videoId);
  if (!video) {
    console.error(`Video with id ${videoId} not found`);
    return <></>;
  }

  // TODO
  // add back button (to the left of the title)
  return (
    <Modal title={video.filename} open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
      keyboard={false} // ignore escape key (don't close modal when esc key is pressed)
      width="90vw"
    >
      <VideoAnnotator video={video} />
    </Modal>
  );
};

export default VideoAnnotatorModal;