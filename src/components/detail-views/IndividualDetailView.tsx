import React, { useEffect, useMemo, useState } from 'react'
import { Button, Flex, Tabs, theme, type TabsProps } from "antd";
import StickyBox from 'react-sticky-box';
import { generatePath, Link } from 'react-router-dom';

import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../../metadata.tsx';
import VideosGridView from '../grid-views/VideosGridView.tsx';
import IndividualsGridView from '../grid-views/IndividualsGridView.tsx';
import { Individual, LocationInfo, RecordType, Video } from '../../types.ts';
import BasicMapView from '../ui/BasicMapView.tsx';
import RecordMetadataForm from './RecordMetadataForm.tsx';
import CropsDashboardView from '../dashboards/CropsDashboardView.tsx';
import BodyPartSelect from '../crops/BodyPartSelect.tsx';
import { filterCropsByBodyPart, getAvailableBodyParts } from '../crops/bodyPartFilters.ts';
import "./IndividualDetailView.scss";

const numCropsToShow = 10;

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

  const bodyPartOptions = cropsUniqueValuesPerField['body_part'] ?? [];
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const availableBodyParts = useMemo(
    () => getAvailableBodyParts(individual.crops),
    [individual.crops]
  );
  const filteredPreviewCrops = useMemo(
    () => filterCropsByBodyPart(individual.crops, selectedBodyPart),
    [individual.crops, selectedBodyPart]
  );

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
      <BodyPartSelect
        bodyPartOptions={bodyPartOptions}
        selectedBodyPart={selectedBodyPart}
        setSelectedBodyPart={setSelectedBodyPart}
        availableBodyParts={availableBodyParts}
      />
      <Flex gap={5} style={{marginTop: 10, marginBottom: 20, width: 'fit-content', maxWidth: '100%', overflow: 'scroll'}}>
        {
          filteredPreviewCrops
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
                <img src={crop.imageUrl} height={150} className="individual-preview-image" />
              </Link>
            ))
        }
        {
          // Show button to view more crops if truncated
          (filteredPreviewCrops.length > numCropsToShow) &&
          <Button
            color="default"
            variant="link"
            style={{alignSelf: 'center'}}
            onClick={() => setActiveTabKey('crops')}
          >+{filteredPreviewCrops.length - numCropsToShow} more</Button>
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
