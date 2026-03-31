import React from 'react'
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

import { useAuth, useCropsStore } from "../DataStores.tsx";
import { cropsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/dashboards/DashboardContent.tsx';
import CropsDashboardView from '../components/dashboards/CropsDashboardView.tsx';
import { CropsDashboardSider, useCropsDashboardSiderState } from '../components/dashboards/CropsDashboardSider.tsx';

const CropsDashboardPage: React.FC = () => {
  const crops = useCropsStore((state) => state.processedRecords);
  const uniqueValuesPerField = useCropsStore((state) => state.uniqueValuesPerField);
  const { user } = useAuth();

  const isFetched = useCropsStore((state) => state.isFetched);
  const [selectedSiderKey, setSelectedSiderKey, cropsBySiderKey, cropsFiltered] = useCropsDashboardSiderState(crops, cropsMetadataFields, user);

  return (
    <>
      <Layout
        className="no-background"
        style={{ /* background: colorBgContainer */ }}
      >
        <CropsDashboardSider
          selectedSiderKey={selectedSiderKey}
          setSelectedSiderKey={setSelectedSiderKey}
          cropsBySiderKey={cropsBySiderKey}
          cropsMetadataFields={cropsMetadataFields}
          uniqueValuesPerField={uniqueValuesPerField}
        />
        <DashboardContent>
          {isFetched ? (
            <CropsDashboardView
              crops={cropsFiltered}
              uniqueValuesPerField={uniqueValuesPerField}
              cropsMetadataFields={cropsMetadataFields}
            />
          ) : null}
        </DashboardContent>
      </Layout>
      <Outlet />
    </>
  )
};

export default CropsDashboardPage;