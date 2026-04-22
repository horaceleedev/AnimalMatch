import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { differenceBy, intersection } from 'es-toolkit';
import { Button, Flex, Input, Layout, Modal, Popover, Space, Tabs, Tooltip } from "antd";
import type { TabsProps } from "antd";
const { TextArea } = Input;
const { Content, Sider } = Layout;
import Icon, { ArrowLeftOutlined, CheckOutlined, CloseOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useShallow } from 'zustand/react/shallow';
import classnames from 'classnames';

import RightPanelOpen from '../assets/material_symbols/right_panel_open_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import RightPanelClose from '../assets/material_symbols/right_panel_close_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import { useIndividualsStoreWithCrops, useCropsStore, useVideosStoreWithUsers } from "../DataStores.tsx";
import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import VideoDetailView from '../components/detail-views/VideoDetailView.tsx';
import IndividualDetailView from '../components/detail-views/IndividualDetailView.tsx';
import CropDetailView from '../components/detail-views/CropDetailView.tsx';
import VideosGridView from '../components/grid-views/VideosGridView.tsx';
import IndividualsGridView from '../components/grid-views/IndividualsGridView.tsx';
import IndividualsDashboardView from '../components/dashboards/IndividualsDashboardView.tsx';
import CropsDashboardView from '../components/dashboards/CropsDashboardView.tsx';
import RecordActionsButton from '../components/ui/RecordActionsButton.tsx';
import { Individual, Video } from '../types.ts';
import { getUniqueLocationsFromIndividuals } from '../utils/utils.ts';
import "./CompareModal.scss";

const recordTypeShortNameToLongName: Record<string, string> = {
  "i": "individuals",
  "v": "videos",
  "c": "crops",
};
const recordTypeLongNameToShortName: Record<string, string> = {
  "individuals": "i",
  "videos": "v",
  "crops": "c",
};

const CompareModal: FC = () => {
  const navigate = useNavigate();
  const { videoId, individualId, cropId, compareId } = useParams();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();
  const urlTimestamp = parseFloat(searchParams.get('t') || '');
  const timestamp = Number.isFinite(urlTimestamp) ? urlTimestamp : undefined;
  const routeSplits = routerLocation.pathname.split('/');
  const isCompareView = routeSplits[2] === "compare";
  const compareType = recordTypeShortNameToLongName[routeSplits[5]];
  console.log(videoId, individualId, cropId, compareId, routerLocation, isCompareView, compareType)
  // Outlet context contains filtered videos from the parent dashboard view.
  const outletContext = useOutletContext<{
    videos?: Video[],
  }>();
  const leftPanelVideos = outletContext?.videos || [];

  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleDismiss = () => {
    setIsModalOpen(false);
  };
  const handleOpenChange = (open: boolean) => {
    // Navigate back to the /videos, /individuals, or /crops page when the modal is closed
    if (open === false) navigate(routeSplits.slice(0,2).join('/'));
  };

  const { videos, updateVideo, videosUniqueValuesPerField, uniqueVideoLocations } = useVideosStoreWithUsers();
  const { individuals, updateIndividual, deleteIndividual, individualsUniqueValuesPerField, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
  // TODO figure out if I should compute this (uniqueIndividualLocations) here or inside DataStores.tsx
  const uniqueIndividualLocations = useMemo(() => {
    return getUniqueLocationsFromIndividuals(individuals, videos);
  }, [individuals, videos]);

  const [crops, updateCrop, deleteCrop] = useCropsStore(
    useShallow((state) => [state.processedRecords, state.update, state.delete])
  );

  const videoDetailProps = useMemo(() => {
    if (!videoId) return;

    const video = videos.find(x => x.id === videoId);
    if (!video) return;

    const individualsInVideo = individuals.filter(x => x.videos.includes(video.id)) || [];
    return {
      video,
      individualsInVideo,
    };
  }, [videoId, videos, individuals]);

  const individualDetailProps = useMemo(() => {
    if (!individualId) return;

    const individual = individuals.find(x => x.id === individualId);
    if (!individual) return;

    const videosWithIndividual = videos.filter(v => individual.videos.includes(v.id));
    const seenTogetherIndividuals = individuals.filter(indiv => (indiv.id !== individual.id) && intersection(indiv.videos, videosWithIndividual.map(x => x.id)).length > 0);
    return {
      individual,
      videosWithIndividual,
      seenTogetherIndividuals,
    };
  }, [individualId, videos, individuals]);

  const cropDetailProps = useMemo(() => {
    if (!cropId) return;

    const crop = crops.find(x => x.id === cropId);
    if (!crop) return;

    return {
      crop
    };
  }, [cropId, crops]);


  // Video/individual on right panel
  const compareVideoDetailProps = useMemo(() => {
    if (compareType !== "videos") return;

    const compareVideo = videos.find(x => x.id === compareId);
    if (!compareVideo) return;

    const individualsInCompareVideo = individuals.filter(x => x.videos.includes(compareVideo.id));
    return {
      video: compareVideo,
      individualsInVideo: individualsInCompareVideo,
    }
  }, [compareId, compareType, videos, individuals]);
  const compareIndividualDetailProps = useMemo(() => {
    if (compareType !== "individuals") return;

    const compareIndividual = individuals.find(x => x.id === compareId);
    if (!compareIndividual) return;

    const videosWithCompareIndividual = videos.filter(v => compareIndividual.videos.includes(v.id));
    const individualsSeenTogetherWithCompareIndividual = individuals.filter(indiv => (indiv.id !== compareIndividual.id) && intersection(indiv.videos, videosWithCompareIndividual.map(x => x.id)).length > 0);
    return {
      individual: compareIndividual,
      seenTogetherIndividuals: individualsSeenTogetherWithCompareIndividual,
      videosWithIndividual: videosWithCompareIndividual,
    }
  }, [compareId, compareType, individuals, videos]);
  const compareCropDetailProps = useMemo(() => {
    if (compareType !== "crops") return;

    const compareCrop = crops.find(x => x.id === compareId);
    if (!compareCrop) return;

    return {
      crop: compareCrop,
    };
  }, [compareId, compareType, crops]);
  const [shortlistedIndividualIds, setShortlistedIndividualIds] = useState<string[]>([]);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Reset scroll (i.e. scroll up to the top) on the left panel
    // when switching to another video/individual/crop (on the left panel)
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [videoId, individualId, cropId]);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Reset scroll (i.e. scroll up to the top) on the right panel
    // when entering a VideoDetailView or IndividualDetailView (on the right panel)
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = 0;
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
    const isShortlisted = shortlistedIndividualIds.includes(individual.id);
    return (
      <Tooltip title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}>
        <Button
          icon={isShortlisted ? <StarFilled /> : <StarOutlined />}
          shape="circle"
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
          }}
          onClick={(e) => {
            e.preventDefault();
            if (isShortlisted) {
              setShortlistedIndividualIds([...shortlistedIndividualIds.filter(x => x !== individual.id)]);
            } else {
              setShortlistedIndividualIds([...shortlistedIndividualIds, individual.id]);
            }
          }}
        />
      </Tooltip>
    );
  };

  let leftPanel;
  let leftPanelVideosLinkTemplate, leftPanelIndividualsLinkTemplate, leftPanelCropsLinkTemplate;
  if (isCompareView) {
    // replace routeSplits[3] and routeSplits[4] with "v" and ":videoId" respectively
    // (or the equivalent for individuals/crops)
    leftPanelVideosLinkTemplate = [...routeSplits.slice(0,3), "v", ":videoId", ...routeSplits.slice(5)].join("/");
    leftPanelIndividualsLinkTemplate = [...routeSplits.slice(0,3), "i", ":individualId", ...routeSplits.slice(5)].join("/");
    leftPanelCropsLinkTemplate = [...routeSplits.slice(0,3), "c", ":cropId", ...routeSplits.slice(5)].join("/");
  }
  if (videoDetailProps) {
    leftPanel = (
      <VideoDetailView
        video={videoDetailProps.video}
        timestamp={timestamp}
        individualsInVideo={videoDetailProps.individualsInVideo}
        uniqueValuesPerField={videosUniqueValuesPerField}
        uniqueLocations={uniqueVideoLocations}
        individualsLinkTemplate={leftPanelIndividualsLinkTemplate}
        videoLinkTemplate={leftPanelVideosLinkTemplate}
        navigationVideos={leftPanelVideos}
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
        cropsUniqueValuesPerField={cropsUniqueValuesPerField}
        uniqueLocations={uniqueIndividualLocations}
        videosLinkTemplate={leftPanelVideosLinkTemplate}
        individualsLinkTemplate={leftPanelIndividualsLinkTemplate}
        cropsLinkTemplate={leftPanelCropsLinkTemplate}
        updateIndividual={updateIndividual}
      />
    );
  } else if (cropDetailProps) {
    leftPanel = (
      <CropDetailView
        crop={cropDetailProps.crop}
        uniqueValuesPerField={cropsUniqueValuesPerField}
        videoLinkTemplate={leftPanelVideosLinkTemplate}
        individualLinkTemplate={leftPanelIndividualsLinkTemplate}
        updateCrop={updateCrop}
      />
    )
  } else {
    leftPanel = <>Error: unknown {routeSplits[1].slice(0, -1)}</>
  }

  let rightPanel;
  if (compareId) {
    let rightPanelVideosLinkTemplate = routeSplits.slice(0,5).join('/') + "/v/:videoId";
    let rightPanelIndividualsLinkTemplate = routeSplits.slice(0,5).join('/') + "/i/:individualId";
    let rightPanelCropsLinkTemplate = routeSplits.slice(0,5).join('/') + "/c/:cropId";

    if (compareVideoDetailProps) {
      rightPanel = (
        <VideoDetailView key={compareVideoDetailProps.video.id}
          video={compareVideoDetailProps.video}
          timestamp={timestamp}
          individualsInVideo={compareVideoDetailProps.individualsInVideo}
          uniqueValuesPerField={videosUniqueValuesPerField}
          uniqueLocations={uniqueVideoLocations}
          individualsLinkTemplate={rightPanelIndividualsLinkTemplate}
          videoLinkTemplate={rightPanelVideosLinkTemplate}
          navigationVideos={videos}
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
          cropsUniqueValuesPerField={cropsUniqueValuesPerField}
          uniqueLocations={uniqueIndividualLocations}
          videosLinkTemplate={rightPanelVideosLinkTemplate}
          individualsLinkTemplate={rightPanelIndividualsLinkTemplate}
          cropsLinkTemplate={rightPanelCropsLinkTemplate}
          updateIndividual={updateIndividual}
        />
      );
    } else if (compareCropDetailProps) {
      rightPanel = (
        <CropDetailView key={compareCropDetailProps.crop.id}
          crop={compareCropDetailProps.crop}
          uniqueValuesPerField={cropsUniqueValuesPerField}
          videoLinkTemplate={rightPanelVideosLinkTemplate}
          individualLinkTemplate={rightPanelIndividualsLinkTemplate}
          updateCrop={updateCrop}
        />
      );
    } else {
      rightPanel = <>Error: unknown {routeSplits[1].slice(0, -1)}</>
    }
  } else {
    const items: TabsProps['items'] = [
      {
        key: 'videos',
        label: <Link to="./v" style={{color: 'inherit'}}>Videos</Link>,
      },
      {
        key: 'individuals',
        label: <Link to="./i" style={{color: 'inherit'}}>Individuals</Link>,
      },
      {
        key: 'crops',
        label: <Link to="./c" style={{color: 'inherit'}}>Crops</Link>,
      },
    ];
    rightPanel = (
      <>
        <Tabs activeKey={compareType} items={items} />
        {
          (compareType === 'videos') ?
          <VideosGridView
            videos={videos}
            videoMetadataFields={videoMetadataFields}
            isListView={true}
            linkTemplate={routerLocation.pathname + "/:videoId"}
            sortFields={[]}
            sortOrders={[]}
            groupFields={[]}
            groupOrders={[]}
          />
          :
          (compareType === 'individuals') ?
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
              linkTemplate={routerLocation.pathname + "/:individualId"}
              listViewButtons={individualDetailProps ? shortlistButton : undefined}
              defaultGroupFields={[]}
              defaultGroupOrders={[]}
            />
          </>
          :
          (compareType === 'crops') ?
          <CropsDashboardView
            crops={crops}
            uniqueValuesPerField={cropsUniqueValuesPerField}
            cropsMetadataFields={cropsMetadataFields}
            linkTemplate={routerLocation.pathname + "/:cropId"}
          />
          :
          <>Invalid URL</>
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
    } else if (cropDetailProps) {
      modalTitleText = "Crop";
    }
  }
  const modalTitle = (
    <Flex gap="small" align="center" style={{position: 'relative'}}>
      {
        isCompareView ?
        <Link to={
          // Back to the /videos/:videoId, /individuals/:individualId, or /crops/:cropId page
          routeSplits.slice(0,2).join('/') + "/" + routeSplits[4]
        }>
          <Tooltip title={"Back to " + (
            (videoDetailProps && "video " + videoDetailProps.video.filename) ||
            (individualDetailProps && "individual " + individualDetailProps.individual.name) ||
            (cropDetailProps && "crop")
          )}>
            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
          </Tooltip>
        </Link>
        :
        <Link to={
          // Back to the /videos, /individuals, or /crops page
          routeSplits.slice(0,2).join('/')
        }>
          <Tooltip title={"Back to all " + routeSplits[1]}>
            <Button icon={<ArrowLeftOutlined />} type="text"></Button>
          </Tooltip>
        </Link>
      }
      {modalTitleText}
      <div style={{flex: 1}}></div> {/* Spacer */}
      {
        !isCompareView &&
        (
          (
            videoDetailProps &&
            <RecordActionsButton
              recordType="video"
              recordId={videoId!}
              deleteFunction={async (_: string) => {}}
              onDelete={handleDismiss}
            />
          ) ||
          (
            individualDetailProps &&
            <RecordActionsButton
              recordType="individual"
              recordId={individualId!}
              deleteFunction={deleteIndividual}
              onDelete={handleDismiss}
            />
          ) ||
          (
            cropDetailProps &&
            <RecordActionsButton
              recordType="crop"
              recordId={cropId!}
              deleteFunction={deleteCrop}
              onDelete={handleDismiss}
            />
          )
        )
      }
      {
        isCompareView ?
        <Link
          style={{marginRight: "32px"}}
          // Back to the /videos/:videoId, /individuals/:individualId, or /crops/:cropId page
          to={routeSplits.slice(0,2).join('/') + "/" + routeSplits[4]}
        >
          <Tooltip title="Close comparison view">
            <Button type="text" icon={<Icon component={RightPanelClose} />} />
          </Tooltip>
        </Link>
        :
        <Link
          style={{marginRight: "32px"}}
          to={`${routeSplits.slice(0,2).join('/')}/compare/${recordTypeLongNameToShortName[routeSplits[1]]}/${routeSplits[2]}`}
        >
          <Tooltip title="Open comparison view">
            <Button type="text" icon={<Icon component={RightPanelOpen} />} />
          </Tooltip>
        </Link>
      }
    </Flex>
  );
  
  // TODO
  // disable closing by escape key
  return (
    <Modal
      className={classnames("compare-modal", {"crop-modal": cropDetailProps && !isCompareView})}
      title={modalTitle}
      open={isModalOpen}
      footer={null}
      onCancel={handleDismiss}
      afterOpenChange={handleOpenChange}
      centered={true}
    >
      <Layout>
        <Content ref={leftPanelRef}>
          {
            isCompareView &&
            <h3 style={{marginTop: 5}}>
              {
                (videoDetailProps && videoDetailProps.video.filename) ||
                (individualDetailProps && individualDetailProps.individual.name) ||
                (cropDetailProps && "Crop")
              }
            </h3>
          }
          {leftPanel}
        </Content>
        <Sider
          trigger={null}
          collapsible
          collapsed={!isCompareView}
          collapsedWidth={0}
          ref={rightPanelRef}
          width={compareId ? "50%" : "min(50%, 550px)"}
          theme="light"
        >
          {
            isCompareView &&
            <>
              <h3 style={{marginTop: 5}}>
                {
                  (compareVideoDetailProps || compareIndividualDetailProps || compareCropDetailProps) ?
                  <Space>
                    <Link to={routeSplits.slice(0,6).join('/')}>
                      <Tooltip title={`Back to ${compareType}`}>
                        <Button icon={<ArrowLeftOutlined />} type="text"></Button>
                      </Tooltip>
                    </Link>
                    {
                      compareVideoDetailProps && compareVideoDetailProps.video.filename ||
                      compareIndividualDetailProps && (
                        <>
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
                        </>
                      ) ||
                      compareCropDetailProps && "Crop"
                    }
                  </Space>
                  :
                  "Select a video, individual, or crop for comparison"
                }
              </h3>
              {
                (individualDetailProps && !compareId && compareType === "individuals") && 
                <span>Note: the individual on the left and its co-occurrences have been omitted from the list below.</span>
              }

              {rightPanel}
            </>
          }
        </Sider>
        {
          // Shortlist
          (shortlistedIndividualIds.length > 0) &&
          <Popover placement="topRight" title="Shortlist" content={
            <IndividualsGridView
              individuals={individuals.filter(x => shortlistedIndividualIds.includes(x.id))}
              individualsMetadataFields={individualsMetadataFields}
              linkTemplate={routeSplits.slice(0,6).join('/') + "/:individualId"}
              buttons={shortlistButton}
              sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]}
            />
          } arrow={false} overlayInnerStyle={{maxHeight: 'calc(88vh - 180px)', width: 450, overflow: 'scroll'}}>
            {/* <Badge count={shortlistedIndividualIds.length} color="blue"> */}
              <Button
                icon={<StarFilled />}
                // variant="solid" color="primary"
                type="primary"
                style={{
                  position: 'absolute',
                  right: 15,
                  bottom: 25,
                  zIndex: 1000, // ensures this button is visible above the Leaflet map
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
      </Layout>
      {
        // Only show these buttons if the user is comparing two individuals
        (individualDetailProps && compareIndividualDetailProps) &&
        <Space style={{
          position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
          boxShadow: "0px 1px 2px -2px rgba(0,0,0,0.16), 0px 3px 6px 0px rgba(0,0,0,0.12), 0px 5px 12px 4px rgba(0,0,0,0.09)",
          padding: '8px 8px 8px 12px',
          borderRadius: 10,
          background: 'white',
          zIndex: 1000,
        }}>
          <span>Are these two individuals the same?</span>
          <Button onClick={showSameIndividualConfirm} icon={<CheckOutlined />} type="primary">Same individual</Button>
          <Button onClick={showDifferentIndividualConfirm} icon={<CloseOutlined />} type="primary" danger>Different individual</Button>
        </Space>
      }
    </Modal>
  );
};
export default CompareModal;
