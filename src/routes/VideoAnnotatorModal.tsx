import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button, Flex, Modal, Select, Space, Tooltip } from "antd";
import { intersection } from 'es-toolkit';
import { useShallow } from 'zustand/react/shallow';

import { useVideoStore, useIndividualsStoreWithCrops, useAuth } from "../DataStores.tsx";
import VideoAnnotator from '../components/VideoAnnotator/VideoAnnotator.tsx';
import InnerModal from './InnerModal.tsx';
import AnnotationStatusLabel from '../components/ui/AnnotationStatusLabel.tsx';
import PrevNextVideoButtons from '../components/ui/PrevNextVideoButtons.tsx';
import { Individual, RecordType, Video } from '../types.ts';

const VideoAnnotatorModal: React.FC = () => {
  const navigate = useNavigate();
  const { videoId } = useParams<"videoId">();
  console.log(videoId)
  
  // Get videos for navigation (previous/next video) from outlet context (passed from VideosDashboardPage)
  const outletContext = useOutletContext<{
    videos?: Video[],
  }>();
  const navigationVideos = outletContext?.videos || [];

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /videos/:videoId page when the modal is closed
    if (open === false) navigate('/videos/'+videoId);
  };

  const [videos, updateVideo, videosUniqueValuesPerField] = useVideoStore(useShallow((state) => [state.processedRecords, state.update, state.uniqueValuesPerField]));
  const video = videos.find(x => x.id === videoId);

  const { individuals: individuals, createIndividual: _createIndividual, deleteIndividual, individualsUniqueValuesPerField, createCrop, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
  const createIndividual = async (data: Partial<Individual>) => {
    if (!video) throw new Error('Video not found');

    let createdIndividual;
    try {
      createdIndividual = await _createIndividual(data);
    } catch (error) {
      throw error;
    }
    // update annotation status to 'in progress' if it is still 'to annotate'
    if (video.annotation_status === 'to annotate') {
      changeAnnotationStatus('in progress');
    }
    return createdIndividual;
  };
  const individualsInVideo = useMemo(() => {
    if (!video?.id) return [];
    return individuals.filter(indiv => indiv.videos.includes(video.id))
  }, [individuals, video?.id]);

  const changeAnnotationStatus = async (newStatus: string) => {
    if (!video) return;
    try {
      await updateVideo(video.id, { annotation_status: newStatus });
    } catch (error) {
      console.error('Failed to update video annotation status:', error);
    }
  };

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
    <Modal
      title={
        <Flex align="center" gap="middle">
          {video.filename}
          <PrevNextVideoButtons video={video} videoLinkTemplate="/videos/:videoId/annotate" videos={navigationVideos} />
          <Tooltip title="Annotation status">
            <Select
              value={video.annotation_status}
              onChange={changeAnnotationStatus}
              options={videosUniqueValuesPerField['annotation_status'].map((status) => ({
                label: <AnnotationStatusLabel status={status} />,
                value: status,
              }))}
              popupMatchSelectWidth={false}
            />
          </Tooltip>
        </Flex>
      }
      open={isModalOpen}
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