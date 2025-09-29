import React from 'react'
import { Outlet } from 'react-router-dom';

import { useCropsStore } from "../DataStores.tsx";
import { cropsMetadataFields } from '../metadata.tsx';
import CropsDashboardView from '../components/CropsDashboardView.tsx';

const CropsDashboardPage: React.FC = () => {
  const crops = useCropsStore((state) => state.processedRecords);
  const uniqueValuesPerField = useCropsStore((state) => state.uniqueValuesPerField);

  return (
    <>
      <CropsDashboardView
        crops={crops}
        uniqueValuesPerField={uniqueValuesPerField}
        cropsMetadataFields={cropsMetadataFields}
      />
      <Outlet />
    </>
  )
};

export default CropsDashboardPage;