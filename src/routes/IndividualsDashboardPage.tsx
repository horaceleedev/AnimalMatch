import React from 'react'
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

import { useAuth, useIndividualsStoreWithCrops, useVideoStore } from '../DataStores.tsx';
import { individualsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import IndividualsDashboardView from '../components/dashboards/IndividualsDashboardView.tsx';
import { IndividualsDashboardSider, useIndividualsDashboardSiderState } from '../components/dashboards/IndividualsDashboardSider.tsx';
import useDashboardNavigationRecords from '../hooks/useDashboardNavigationRecords.ts';

const IndividualsDashboardPage: React.FC = () => {
  const { individuals, individualsUniqueValuesPerField: uniqueValuesPerField, cropsUniqueValuesPerField } = useIndividualsStoreWithCrops();
  const videos = useVideoStore((state) => state.processedRecords);
  const { user } = useAuth();

  const [selectedSiderKey, setSelectedSiderKey, individualsBySiderKey, individualsFiltered] = useIndividualsDashboardSiderState(individuals, individualsMetadataFields, user);
  const { outletContext, updateNavigationRecords } = useDashboardNavigationRecords(individualsFiltered, '/individuals', 'individuals');

  return (
    <>
      <Layout
        className="no-background"
        style={{ /* background: colorBgContainer */ }}
      >
        <IndividualsDashboardSider
          selectedSiderKey={selectedSiderKey}
          setSelectedSiderKey={setSelectedSiderKey}
          individualsBySiderKey={individualsBySiderKey}
          individualsMetadataFields={individualsMetadataFields}
          uniqueValuesPerField={uniqueValuesPerField}
        />
        <DashboardContent>
          <IndividualsDashboardView
            individuals={individualsFiltered}
            videos={videos}
            uniqueValuesPerField={uniqueValuesPerField}
            bodyPartOptions={cropsUniqueValuesPerField['body_part'] ?? []}
            individualsMetadataFields={individualsMetadataFields}
            onNavigationRecordsChange={updateNavigationRecords}
          />
        </DashboardContent>
      </Layout>
      {/* Outlet for IndividualDetailView */}
      <Outlet context={outletContext} />
    </>
  )
};

export default IndividualsDashboardPage;
