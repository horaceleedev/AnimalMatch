import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { differenceBy, intersection } from 'es-toolkit';
import { Button, Input, Modal, Popover, Space, Splitter, Tabs, Tooltip } from "antd";
import type { TabsProps } from "antd";
const { TextArea } = Input;
import Icon, { ArrowLeftOutlined, CheckOutlined, CloseOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';

import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStore, useVideoStore } from "../DataStores.tsx";
import { individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import VideoDetailView from '../components/VideoDetailView.tsx';
import IndividualDetailView from '../components/IndividualDetailView.tsx';
import VideosGridView from '../components/VideosGridView.tsx';
import IndividualsGridView from '../components/IndividualsGridView.tsx';
import IndividualsDashboardView from '../components/IndividualsDashboardView.tsx';
import { Individual } from '../types.ts';
import { getUniqueLocationsFromIndividuals } from '../utils/utils.ts';
import "./CompareModal.scss";

const CompareModal: React.FC = () => {
  const navigate = useNavigate();
  const { videoId, individualId, compareId } = useParams();
  const routerLocation = useLocation();
  const isCompareView = routerLocation.pathname.split('/')[3] === "compare";
  const compareType = routerLocation.pathname.split('/')[4];
  console.log(videoId, individualId, compareId, routerLocation, isCompareView, compareType)

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /videos or /individuals page when the modal is closed
    if (open === false) navigate(routerLocation.pathname.split('/').slice(0,2).join('/'));
  };

  const [videos, updateVideo, videoUniqueValuesPerField, uniqueVideoLocations] = useVideoStore(
    useShallow((state) => [state.processedRecords, state.update, state.uniqueValuesPerField, state.extra.uniqueLocations])
  );
  const [individuals, updateIndividual, individualsUniqueValuesPerField] = useIndividualsStore(
    useShallow((state) => [state.processedRecords, state.update, state.uniqueValuesPerField])
  );
  // TODO figure out if I should compute this (uniqueIndividualLocations) here or inside DataStores.tsx
  const uniqueIndividualLocations = useMemo(() => {
    return getUniqueLocationsFromIndividuals(individuals, videos);
  }, [individuals, videos]);
  
  const videoDetailProps = useMemo(() => {
    if (videoId) {
      const video = videos.find(x => x.id === videoId);
      if (video) {
        const individualsInVideo = individuals.filter(x => x.videos.includes(video.id)) || [];
        return {
          video,
          individualsInVideo,
        };
      }
    }
  }, [videoId, videos, individuals]);

  const individualDetailProps = useMemo(() => {
    if (individualId) {
      const individual = individuals.find(x => x.id === individualId);
      if (individual) {
        const videosWithIndividual = videos.filter(v => individual.videos.includes(v.id));
        const seenTogetherIndividuals = individuals.filter(indiv => (indiv.id !== individual.id) && intersection(indiv.videos, videosWithIndividual.map(x => x.id)).length > 0);
        return {
          individual,
          videosWithIndividual,
          seenTogetherIndividuals,
        };
      }
    }
  }, [individualId, videos, individuals]);


  // Video/individual on right panel
  const compareVideoDetailProps = useMemo(() => {
    if (compareType === "videos") {
      const compareVideo = videos.find(x => x.id === compareId);
      if (compareVideo) {
        const individualsInCompareVideo = individuals.filter(x => x.videos.includes(compareVideo.id));
        return {
          video: compareVideo,
          individualsInVideo: individualsInCompareVideo,
        }
      }
    }
  }, [compareId, compareType, videos, individuals]);
  const compareIndividualDetailProps = useMemo(() => {
    if (compareType === "individuals") {
      const compareIndividual = individuals.find(x => x.id === compareId);
      if (compareIndividual) {
        const videosWithCompareIndividual = videos.filter(v => compareIndividual.videos.includes(v.id));
        const individualsSeenTogetherWithCompareIndividual = individuals.filter(indiv => (indiv.id !== compareIndividual.id) && intersection(indiv.videos, videosWithCompareIndividual.map(x => x.id)).length > 0);
        return {
          individual: compareIndividual,
          seenTogetherIndividuals: individualsSeenTogetherWithCompareIndividual,
          videosWithIndividual: videosWithCompareIndividual,
        }
      }
    }
  }, [compareId, compareType, individuals, videos]);
  const [shortlistedIndividualIds, setShortlistedIndividualIds] = useState<string[]>([]);

  const rightPanelWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Reset scroll (i.e. scroll up to the top) on the right panel
    // when entering a VideoDetailView or IndividualDetailView (on the right panel)
    if (rightPanelWrapperRef.current) rightPanelWrapperRef.current.scrollTop = 0;
  }, [compareId]);

  const showSameIndividualConfirm = () => {
    // TODO:
    // - check if age, sex match before merging
    // - determine which individual to merge into the other
    // - figure out what to do metadata when merging
    Modal.confirm({
      title: 'Do you want to merge these two individuals?',
      content: 'This action cannot be undone.',
      onOk: () => {
        return new Promise((resolve, reject) => {
          setTimeout(Math.random() > 0.5 ? resolve : reject, 1000);
        }).catch(() => console.log('Oops errors!'));
      },
      onCancel: () => {},
    });
  };
  const showDifferentIndividualConfirm = () => {
    Modal.confirm({
      title: 'Mark as different individuals',
      icon: <></>,
      content: <>
        <TextArea
          placeholder="Write an optional note to explain why these two individuals are different"
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
      </>,
      onOk: () => {
        return new Promise((resolve, reject) => {
          setTimeout(Math.random() > 0.5 ? resolve : reject, 1000);
        }).catch(() => console.log('Oops errors!'));
      },
      onCancel: () => {},
    });
  };

  const shortlistButton = (individual: Individual) => {
    if (shortlistedIndividualIds.includes(individual.id)) {
      return (
        <Tooltip title="Remove from shortlist">
          <Button
            icon={<StarFilled />} shape="circle" style={{
              position: 'absolute',
              top: 5,
              right: 5,
              boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
            }}
            onClick={(e) => {
              e.preventDefault();
              setShortlistedIndividualIds([...shortlistedIndividualIds.filter(x => x !== individual.id)]);
            }}
          />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="Add to shortlist">
          <Button
            icon={<StarOutlined />} shape="circle" style={{
              position: 'absolute',
              top: 5,
              right: 5,
              boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
            }}
            onClick={(e) => {
              e.preventDefault();
              setShortlistedIndividualIds([...shortlistedIndividualIds, individual.id]);
            }}
          />
        </Tooltip>
      );
    }
  };

  let leftPanel;
  if (videoDetailProps) {
    leftPanel = (
      <VideoDetailView
        video={videoDetailProps.video}
        individualsInVideo={videoDetailProps.individualsInVideo}
        uniqueValuesPerField={videoUniqueValuesPerField}
        uniqueLocations={uniqueVideoLocations}
        updateVideo={updateVideo}
      />
    );
  } else if (individualDetailProps) {
    leftPanel = (
      <IndividualDetailView
        individual={individualDetailProps.individual} 
        seenTogetherIndividuals={individualDetailProps.seenTogetherIndividuals}
        videosWithIndividual={individualDetailProps.videosWithIndividual}
        uniqueValuesPerField={individualsUniqueValuesPerField}
        uniqueLocations={uniqueIndividualLocations}
        updateIndividual={updateIndividual}
      />
    );
  } else {
    leftPanel = <>Error: unknown video or individual</>
  }

  let rightPanel;
  if (compareId) {
    if (compareVideoDetailProps) {
      rightPanel = (
        <VideoDetailView key={compareVideoDetailProps.video.id}
          video={compareVideoDetailProps.video}
          individualsInVideo={compareVideoDetailProps.individualsInVideo}
          uniqueValuesPerField={videoUniqueValuesPerField}
          uniqueLocations={uniqueVideoLocations}
          updateVideo={updateVideo}
        />
      );
    } else if (compareIndividualDetailProps) {
      rightPanel = (
        <IndividualDetailView key={compareIndividualDetailProps.individual.id}
          individual={compareIndividualDetailProps.individual} 
          seenTogetherIndividuals={compareIndividualDetailProps.seenTogetherIndividuals}
          videosWithIndividual={compareIndividualDetailProps.videosWithIndividual}
          uniqueValuesPerField={individualsUniqueValuesPerField}
          uniqueLocations={uniqueIndividualLocations}
          updateIndividual={updateIndividual}
        />
      );
    } else {
      rightPanel = <>Error: unknown video or individual</>
    }
  } else {
    const items: TabsProps['items'] = [
      {
        key: 'videos',
        label: <Link to="./videos" style={{color: 'inherit'}}>Videos</Link>,
      },
      {
        key: 'individuals',
        label: <Link to="./individuals" style={{color: 'inherit'}}>Individuals</Link>,
      }
    ];
    rightPanel = (
      <>
        <Tabs activeKey={compareType} items={items} />
        {
          (compareType === 'videos') ?
          <VideosGridView videos={videos} videoMetadataFields={videoMetadataFields} isListView={true} linkBase={routerLocation.pathname} sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]} />
          :
          <>
            {
              // (shortlistedIndividualIds.length > 0) && 
              // <>
              //   <h3>Shortlisted individuals</h3>
              //   <IndividualsGridView
              //     individuals={individuals.filter(x => shortlistedIndividualIds.includes(x.id))}
              //     individualsMetadataFields={individualsMetadataFields}
              //     linkBase={routerLocation.pathname}
              //     buttons={shortlistButton}
              //     sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]}
              //   />
              //   <Divider style={{marginTop: 34}} />
              //   <h3>All individuals</h3>
              // </>
            }
            <IndividualsDashboardView
              individuals={
                individualDetailProps ?
                differenceBy(
                  individuals,
                  [individualDetailProps?.individual, ...individualDetailProps?.seenTogetherIndividuals],
                  indiv => indiv.id
                )
                :
                individuals
              }
              videos={videos}
              uniqueValuesPerField={individualsUniqueValuesPerField}
              individualsMetadataFields={individualsMetadataFields}
              onlyShowListView={true}
              linkBase={routerLocation.pathname}
              listViewButtons={individualDetailProps ? shortlistButton : undefined}
              defaultGroupFields={[]}
              defaultGroupOrders={[]}
            />
          </>
        }
      </>
    );
  }

  let modalTitleText;
  if (isCompareView) {
    modalTitleText = "Comparison view"
    // modalTitleText = "Compare ";
    // if (videoDetailProps) modalTitleText += "video " + videoDetailProps.video.filename;
    // else if (individualDetailProps) modalTitleText += "individual " + individualDetailProps.individual.name;
    // modalTitleText += " with ";
    // if (compareVideoDetailProps) modalTitleText += compareVideoDetailProps.video.filename;
    // else if (compareIndividualDetailProps) modalTitleText += compareIndividualDetailProps.individual.name;
    // else modalTitleText += "(select a video or individual)";
  } else {
    if (videoDetailProps) {
      modalTitleText = videoDetailProps.video.filename;
    } else if (individualDetailProps) {
      modalTitleText = individualDetailProps.individual.name;
    }
  }
  const modalTitle = (
    // <Flex gap="small" align="center" style={{position: 'relative'}}>
    <Space>
      {
        isCompareView ?
        <Link to={
          // Back to the /videos/:videoId or /individuals/:individualId page
          routerLocation.pathname.split('/').slice(0,3).join('/')
        }>
          <Tooltip title={"Back to " + (
            (videoDetailProps && "video " + videoDetailProps.video.filename) ||
            (individualDetailProps && "individual " + individualDetailProps.individual.name)
          )}>
            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
          </Tooltip>
        </Link>
        :
        <Link to={
          // Back to the /videos or /individuals page
          routerLocation.pathname.split('/').slice(0,2).join('/')
        }>
          <Tooltip title={"Back to all " + routerLocation.pathname.split('/')[1]}>
            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
          </Tooltip>
        </Link>
      }
      {modalTitleText}
      {
        !isCompareView &&
        <Link to="compare">
          <Button icon={<Icon component={Compare} />}>Open comparison view</Button>
        </Link>
      }
    </Space>
  );
  
  // TODO
  // disable closing by escape key
  return (
    <Modal
      className="compare-modal"
      title={modalTitle}
      open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
    >
      {
        isCompareView ?
        <>
          <Splitter style={{ height: '100%' }}>
            <Splitter.Panel defaultSize="50%" min="30%" max="70%" style={{padding: "0 10px 10px 10px"}}>
              <h3 style={{marginTop: 5}}>
                {
                  (videoDetailProps && videoDetailProps.video.filename) ||
                  (individualDetailProps && individualDetailProps.individual.name)
                }
              </h3>
              {leftPanel}
            </Splitter.Panel>
            <Splitter.Panel style={{height: "100%"}}>
              <div
                ref={rightPanelWrapperRef}
                style={{height: "100%", overflow: "scroll", padding: "0 10px 10px 20px"}}
              >
                <h3 style={{marginTop: 5}}>
                  {
                    (compareVideoDetailProps && 
                      <Space>
                        <Link to={routerLocation.pathname.split('/').slice(0,5).join('/')}>
                          <Tooltip title="Back to videos">
                            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
                          </Tooltip>
                        </Link>
                        {compareVideoDetailProps.video.filename}
                      </Space>
                    ) ||
                    (
                      compareIndividualDetailProps && 
                      <Space>
                        <Link to={routerLocation.pathname.split('/').slice(0,5).join('/')}>
                          <Tooltip title="Back to individuals">
                            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
                          </Tooltip>
                        </Link>
                        {compareIndividualDetailProps.individual.name}
                        {
                          // Only show 'Shortlist' button if the left panel has an individual
                          individualDetailProps && 
                          (
                            shortlistedIndividualIds.includes(compareIndividualDetailProps.individual.id) ?
                            <Button
                              icon={<StarFilled />}
                              onClick={() => setShortlistedIndividualIds([...shortlistedIndividualIds.filter(x => x !== compareIndividualDetailProps.individual.id)])}
                            >
                              Remove from shortlist
                            </Button>
                            :
                            <Button
                              icon={<StarOutlined />}
                              onClick={() => setShortlistedIndividualIds([...shortlistedIndividualIds, compareIndividualDetailProps.individual.id])}
                            >
                              Shortlist
                            </Button>
                          )
                        }
                      </Space>
                    ) ||
                    "Select a video or individual for comparison"
                  }
                </h3>
                {
                  (individualDetailProps && !compareId && compareType === "individuals") && 
                  <span>Note: the individual on the left and all other individuals seen together have been omitted from the list below.</span>
                }

                {rightPanel}
                
                {
                  // Shortlist
                  (shortlistedIndividualIds.length > 0) &&
                  <Popover placement="topRight" title="Shortlist" content={
                    <div style={{maxHeight: 'calc(88vh - 180px)', width: 450, overflow: 'scroll'}}>
                      <IndividualsGridView
                        individuals={individuals.filter(x => shortlistedIndividualIds.includes(x.id))}
                        individualsMetadataFields={individualsMetadataFields} 
                        linkBase={routerLocation.pathname.split('/').slice(0,5).join('/')}
                        buttons={shortlistButton}
                        sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]}
                      />
                    </div>
                  } arrow={false}>
                    {/* <Badge count={shortlistedIndividualIds.length} color="blue"> */}
                      <Button
                        icon={<StarFilled />}
                        // variant="solid" color="primary"
                        type="primary"
                        style={{
                          position: 'absolute',
                          right: 15,
                          bottom: 25,
                          zIndex: 1,
                          // boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
                          boxShadow: "0px 1px 2px -2px rgba(0,0,0,0.16), 0px 3px 6px 0px rgba(0,0,0,0.12), 0px 5px 12px 4px rgba(0,0,0,0.09)",
                          background: "#1677ff" // this is needed because when the popover is open, the button background turns transparent for some reason
                        }}
                      >
                        View shortlist ({shortlistedIndividualIds.length})
                      </Button>
                    {/* </Badge> */}
                  </Popover>
                }
              </div>
            </Splitter.Panel>
          </Splitter>
          {
            // Only show these buttons if the user is comparing two individuals
            (individualDetailProps && compareIndividualDetailProps) &&
            <Space style={{
              position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
              boxShadow: "0px 1px 2px -2px rgba(0,0,0,0.16), 0px 3px 6px 0px rgba(0,0,0,0.12), 0px 5px 12px 4px rgba(0,0,0,0.09)",
              padding: '8px 8px 8px 12px',
              borderRadius: 10,
              background: 'white',
              zIndex: 1,
            }}>
              <span>Are these two individuals the same?</span>
              <Button onClick={showSameIndividualConfirm} icon={<CheckOutlined />} type="primary">Same individual</Button>
              <Button onClick={showDifferentIndividualConfirm} icon={<CloseOutlined />} type="primary" danger>Different individual</Button>
            </Space>
          }
        </>
        :
        leftPanel
      }
    </Modal>
  );
};
export default CompareModal;
