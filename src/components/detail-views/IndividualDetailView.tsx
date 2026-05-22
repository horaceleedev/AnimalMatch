import React, { useEffect, useMemo, useState } from 'react'
import { Button, Flex, Select, Space, Tabs, theme, Tooltip, type TabsProps } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import StickyBox from 'react-sticky-box';
import { generatePath, Link } from 'react-router-dom';

import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../../metadata.tsx';
import VideosGridView from '../grid-views/VideosGridView.tsx';
import IndividualsGridView from '../grid-views/IndividualsGridView.tsx';
import { Individual, LocationInfo, RecordType, Video } from '../../types.ts';
import BasicMapView from '../ui/BasicMapView.tsx';
import RecordMetadataForm from './RecordMetadataForm.tsx';
import CropsDashboardView from '../dashboards/CropsDashboardView.tsx';
import { useCropsStore } from '../../DataStores.tsx';
import "./IndividualDetailView.scss";

const FEATURED_BORDER_COLOR = '#faad14';
const numCropsToShow = 10;
const ANY_BODY_PART = "any body part";

type IndividualDetailViewProps = {
  individual: Individual;
  seenTogetherIndividuals: Individual[];
  videosWithIndividual: Video[];
  uniqueValuesPerField: Record<string, string[]>;
  cropsUniqueValuesPerField: Record<string, string[]>;
  uniqueLocations: LocationInfo[];
  videosLinkTemplate?: string;
  individualsLinkTemplate?: string;
  cropsLinkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
  updateIndividual: (id: string, data: Partial<Individual>) => Promise<Individual>;
}

const IndividualDetailView: React.FC<IndividualDetailViewProps> = ({
  individual,
  seenTogetherIndividuals,
  videosWithIndividual,
  uniqueValuesPerField,
  cropsUniqueValuesPerField,
  uniqueLocations,
  videosLinkTemplate,
  individualsLinkTemplate,
  cropsLinkTemplate,
  openModal,
  updateIndividual,
}: IndividualDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  const highlightLocationIds = useMemo(
    () => new Set(videosWithIndividual.map(video => JSON.stringify([video.lat, video.long]))),
    [videosWithIndividual]
  );

  const bodyPartOptions = [ANY_BODY_PART, ...(cropsUniqueValuesPerField['body_part'] ?? [])];
  const [selectedBodyPart, setSelectedBodyPart] = useState(ANY_BODY_PART);
  const availableBodyParts = useMemo(
    () => new Set(individual.crops.map(crop => crop.body_part)),
    [individual.crops]
  );

  const updateCrop = useCropsStore((state) => state.update);

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const renderStickyTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox offsetTop={-10 /* based on the padding-top of the left/right panels of CompareModal */} style={{ zIndex: 1 }}>
      <DefaultTabBar {...props} style={{ background: colorBgContainer }} />
    </StickyBox>
  );
  const [activeTabKey, setActiveTabKey] = useState('overview');

  return (
    <div className="individual-detail-view">
      {/* Images display */}
      {/* Body part selector */}
      <Space>
        <span>Show crops of:</span>
        <Select
          variant="borderless"
          popupMatchSelectWidth={false}
          defaultValue={ANY_BODY_PART}
          options={
            bodyPartOptions.map(bodyPart => ({ value: bodyPart, label: bodyPart, disabled: bodyPart !== ANY_BODY_PART && !availableBodyParts.has(bodyPart) }))
          }
          value={selectedBodyPart}
          onChange={(value) => setSelectedBodyPart(value)}
        />
      </Space>
      <Flex gap={5} style={{marginTop: 10, marginBottom: 20, width: 'fit-content', maxWidth: '100%', overflow: 'scroll'}}>
        {
          individual.crops
            .filter(crop => (selectedBodyPart === ANY_BODY_PART || crop.body_part === selectedBodyPart))
            .slice(0, numCropsToShow)
            .map(crop => (
              <Link
                key={crop.id}
                to={generatePath(cropsLinkTemplate || "/crops/:cropId", {cropId: crop.id})}
                onClick={(e) => {
                  if (!openModal) return;
                  e.preventDefault();
                  openModal("crop", crop.id);
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={crop.imageUrl}
                    height={150}
                    className="individual-preview-image"
                    style={{ outline: crop.is_featured ? `2px solid ${FEATURED_BORDER_COLOR}` : undefined, borderRadius: 4 }}
                  />
                  <Tooltip title={crop.is_featured ? 'Remove from featured' : 'Mark as featured'}>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        crop.is_featured
                          ? <StarFilled style={{ color: FEATURED_BORDER_COLOR }} />
                          : <StarOutlined style={{ color: 'white' }} />
                      }
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: 4,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateCrop(crop.id, { is_featured: !crop.is_featured });
                      }}
                    />
                  </Tooltip>
                </div>
              </Link>
            ))
        }
        {
          // Show button to view more crops if truncated
          (individual.crops.length > numCropsToShow) &&
          <Button
            color="default"
            variant="link"
            style={{alignSelf: 'center'}}
            onClick={() => setActiveTabKey('crops')}
          >+{individual.crops.length - numCropsToShow} more</Button>
        }
      </Flex>
      <Tabs
        defaultActiveKey="overview"
        renderTabBar={renderStickyTabBar}
        activeKey={activeTabKey}
        onChange={(key) => setActiveTabKey(key)}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <>
                <RecordMetadataForm
                  processedRecord={individual}
                  metadataFields={individualsMetadataFields}
                  uniqueValuesPerField={uniqueValuesPerField}
                  updateFunction={updateIndividual}
                />
                {
                  showMap && // Temporary hack needed because map wasn't showing up properly
                  <BasicMapView
                    style={{height: 400, width: 600}}
                    uniqueLocations={uniqueLocations} 
                    highlightLocationIds={highlightLocationIds}
                  />
                }
              </>
            ),
          },
          {
            key: 'crops',
            label: 'Crops',
            children: (
              <>
                <h3 style={{marginTop: 0}}>All crops for this individual</h3>
                {
                  (individual.crops.length > 0) ?
                  <CropsDashboardView
                    crops={individual.crops}
                    uniqueValuesPerField={cropsUniqueValuesPerField}
                    cropsMetadataFields={cropsMetadataFields}
                    onlyShowGridView={true}
                    linkTemplate={cropsLinkTemplate}
                    openModal={openModal}
                  />
                  :
                  <p>No crops available for this individual</p>
                }
              </>
            ),
          },
          {
            key: 'videos',
            label: 'Videos',
            children: (
              <>
                <h3 style={{marginTop: 0}}>Videos with this individual</h3>
                {
                  videosWithIndividual.length > 0 ?
                  <VideosGridView
                    videos={videosWithIndividual}
                    videoMetadataFields={videoMetadataFields}
                    isListView={false}
                    linkTemplate={videosLinkTemplate}
                    openModal={openModal}
                  />
                  :
                  <p>No videos with this individual</p>
                }
              </>
            ),
          },
          {
            key: 'co-occurrences',
            label: 'Co-occurrences',
            children: (
              <>
                <h3 style={{marginTop: 0}}>Other individuals seen together with this individual</h3>
                {
                  (seenTogetherIndividuals.length > 0) ?
                  <IndividualsGridView
                    individuals={seenTogetherIndividuals}
                    individualsMetadataFields={individualsMetadataFields}
                    linkTemplate={individualsLinkTemplate}
                    openModal={openModal}
                  />
                  :
                  <p>No other individuals seen together</p>
                }
              </>
            ),
          },
        ]}
      />
    </div>
  )
};

export default IndividualDetailView;
