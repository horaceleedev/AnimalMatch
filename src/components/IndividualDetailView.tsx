import React, { useEffect, useState } from 'react'
import { Button, Flex, Image, Tabs, theme, type TabsProps } from "antd";
import StickyBox from 'react-sticky-box';

import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import VideosGridView from '../components/VideosGridView.tsx';
import IndividualsGridView from '../components/IndividualsGridView.tsx';
import { Individual, LocationInfo, Video } from '../types.ts';
import BasicMapView from './BasicMapView.tsx';
import RecordMetadataForm from './RecordMetadataForm.tsx';
import CropsDashboardView from './CropsDashboardView.tsx';

const numCropsToShow = 10;

type IndividualDetailViewProps = {
  individual: Individual;
  seenTogetherIndividuals: Individual[];
  videosWithIndividual: Video[];
  uniqueValuesPerField: Record<string, string[]>;
  cropsUniqueValuesPerField: Record<string, string[]>;
  uniqueLocations: LocationInfo[];
  updateIndividual: (id: string, data: Partial<Individual>) => Promise<void>;
}

const IndividualDetailView: React.FC<IndividualDetailViewProps> = ({
  individual,
  seenTogetherIndividuals,
  videosWithIndividual,
  uniqueValuesPerField,
  cropsUniqueValuesPerField,
  uniqueLocations,
  updateIndividual,
}: IndividualDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const renderStickyTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox style={{ zIndex: 1 }}>
      <DefaultTabBar {...props} style={{ background: colorBgContainer }} />
    </StickyBox>
  );
  const [activeTabKey, setActiveTabKey] = useState('overview');

  return (
    <div style={{ padding: 10 /* padding needed for drop-shadows to display properly when this component is used inside a modal */ }}>
      {/* Images display */}
      <Flex gap={5} style={{marginTop: 10, marginBottom: 20, width: 'fit-content', maxWidth: '100%', overflow: 'scroll'}}>
        <Image.PreviewGroup>
          {
            individual.crops
              .slice(0, numCropsToShow)
              .map(crop => (
                <Image
                  key={crop.id}
                  height={150}
                  src={crop.imageUrl}
                  style={{width: 'unset'}}
                />
              ))
          }
        </Image.PreviewGroup>
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
                    highlightLocationIds={videosWithIndividual.map(video => JSON.stringify([video.lat, video.long]))}
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
                    // linkBase={undefined}
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
                    sortFields={[]}
                    sortOrders={[]}
                    groupFields={[]}
                    groupOrders={[]}
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
                    sortFields={[]}
                    sortOrders={[]}
                    groupFields={[]}
                    groupOrders={[]}
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