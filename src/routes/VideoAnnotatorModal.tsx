import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, Space } from "antd";
import { intersection } from 'es-toolkit';

import { useVideoStore, useIndividualsStoreWithCrops, useAuth } from "../DataStores.tsx";
import VideoAnnotator from '../components/VideoAnnotator/VideoAnnotator.tsx';
import InnerModal from './InnerModal.tsx';
import { RecordType } from '../types.ts';

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

  const videos = useVideoStore((state) => state.processedRecords);
  const video = videos.find(x => x.id === videoId);

  const { individuals: individuals, createIndividual, deleteIndividual, individualsUniqueValuesPerField, createCrop, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
  const individualsInVideo = useMemo(() => {
    if (!video?.id) return [];
    return individuals.filter(indiv => indiv.videos.includes(video.id))
  }, [individuals, video?.id]);

  const { user } = useAuth();

  const [innerModalProps, setInnerModalProps] = useState<{ type?: RecordType; id?: string; }>({
    type: undefined,
    id: undefined,
  });

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
      <VideoAnnotator
        video={video}
        individualsInVideo={individualsInVideo}
        individualsUniqueValuesPerField={individualsUniqueValuesPerField}
        cropsUniqueValuesPerField={cropsUniqueValuesPerField}
        userId={user?.id}
        createIndividual={createIndividual}
        deleteIndividual={deleteIndividual}
        createCrop={createCrop}
        openModal={(type, id) => setInnerModalProps({ type, id })}
      />
      <InnerModal {...innerModalProps} exitModal={() => setInnerModalProps({ type: undefined, id: undefined })} />
    </Modal>
  );
};

export default VideoAnnotatorModal;