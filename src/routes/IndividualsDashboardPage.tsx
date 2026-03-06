import React from 'react'
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

import { useAuth, useIndividualsStoreWithCrops, useVideoStore } from '../DataStores.tsx';
import { individualsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import IndividualsDashboardView from '../components/dashboards/IndividualsDashboardView.tsx';
import { IndividualsDashboardSider, useIndividualsDashboardSiderState } from '../components/dashboards/IndividualsDashboardSider.tsx';

const IndividualsDashboardPage: React.FC = () => {
  const { individuals, individualsUniqueValuesPerField: uniqueValuesPerField } = useIndividualsStoreWithCrops();
  const videos = useVideoStore((state) => state.processedRecords);
  const { user } = useAuth();

  const [selectedSiderKey, setSelectedSiderKey, individualsBySiderKey, individualsFiltered] = useIndividualsDashboardSiderState(individuals, individualsMetadataFields, user);

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
            individualsMetadataFields={individualsMetadataFields}
          />
        </DashboardContent>
      </Layout>
      <Outlet />
    </>
  )
};

export default IndividualsDashboardPage;
