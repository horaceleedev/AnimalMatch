import React, { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Flex, Modal, Select, Tooltip } from "antd";
import { useShallow } from 'zustand/react/shallow';

import { useVideoStore, useIndividualsStoreWithCrops, useAuth } from "../DataStores.tsx";
import InnerModal from './InnerModal.tsx';
import AnnotationStatusLabel from '../components/ui/AnnotationStatusLabel.tsx';
import { PrevNextVideoButtons } from '../components/ui/PrevNextButtons.tsx';
import { Individual, RecordType, Video, Crop } from '../types.ts';

// TODO: Once this component is in the repo then we can remove this hack
type VideoAnnotatorComponentType = React.ComponentType<{
  video: Video;
  individuals: Individual[];
  individualsUniqueValuesPerField: Record<string, string[]>;
  cropsUniqueValuesPerField: Record<string, string[]>;
  userId?: string;
  createIndividual: (data: Partial<Individual>) => Promise<Individual>;
  updateIndividual: (id: string, data: Partial<Individual>) => Promise<Individual>;
  deleteIndividual: (id: string) => Promise<void>;
  createCrop: (data: Partial<Crop>) => Promise<Crop>;
  openModal: (type: RecordType, id: string) => void;
}>;

const videoAnnotatorModules = import.meta.glob('../components/VideoAnnotator/VideoAnnotator.tsx');

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

  const { individuals: individuals, createIndividual: _createIndividual, updateIndividual, deleteIndividual, individualsUniqueValuesPerField, createCrop, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
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

  const changeAnnotationStatus = async (newStatus: string) => {
    if (!video) return;
    try {
      await updateVideo(video.id, { annotation_status: newStatus });
    } catch (error) {
      console.error('Failed to update video annotation status:', error);
    }
  };

  const { user } = useAuth();
  const [VideoAnnotatorComponent, setVideoAnnotatorComponent] = useState<VideoAnnotatorComponentType | null>(null);
  const [annotatorLoadError, setAnnotatorLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loader = videoAnnotatorModules['../components/VideoAnnotator/VideoAnnotator.tsx'];
    if (!loader) {
      setAnnotatorLoadError("Video annotator module is not available in this repo checkout.");
      return;
    }

    loader()
      .then((mod) => {
        setVideoAnnotatorComponent(() => (mod as { default: VideoAnnotatorComponentType }).default);
      })
      .catch((error) => {
        console.error("Failed to load VideoAnnotator module:", error);
        setAnnotatorLoadError("Failed to load video annotator module.");
      });
  }, []);

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
          <PrevNextVideoButtons
            record={video}
            recordLinkTemplate="/videos/:videoId/annotate"
            records={navigationVideos}
            flexProps={{ gap: "small" }}
          />
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
      {
        VideoAnnotatorComponent ?
        <VideoAnnotatorComponent
          video={video}
          individuals={individuals}
          individualsUniqueValuesPerField={individualsUniqueValuesPerField}
          cropsUniqueValuesPerField={cropsUniqueValuesPerField}
          userId={user?.id}
          createIndividual={createIndividual}
          updateIndividual={updateIndividual}
          deleteIndividual={deleteIndividual}
          createCrop={createCrop}
          openModal={(type: RecordType, id: string) => setInnerModalProps({ type, id })}
        />
        :
        <div>{annotatorLoadError ?? "Loading video annotator..."}</div>
      }
      <InnerModal {...innerModalProps} exitModal={() => setInnerModalProps({ type: undefined, id: undefined })} />
    </Modal>
  );
};

export default VideoAnnotatorModal;
