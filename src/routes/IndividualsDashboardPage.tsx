import React, { useState } from 'react'
import { Outlet } from 'react-router-dom';

import { useIndividualsStoreWithCrops, useVideoStore } from '../DataStores.tsx';
import { individualsMetadataFields } from '../metadata.tsx';
import DashboardContent from '../components/DashboardContent.tsx';
import IndividualsDashboardView from '../components/IndividualsDashboardView.tsx';

const IndividualsDashboardPage: React.FC = () => {
  const { individuals, individualsUniqueValuesPerField: uniqueValuesPerField } = useIndividualsStoreWithCrops();
  const videos = useVideoStore((state) => state.processedRecords);

  return (
    <DashboardContent>
      <IndividualsDashboardView
        individuals={individuals}
        videos={videos}
        uniqueValuesPerField={uniqueValuesPerField}
        individualsMetadataFields={individualsMetadataFields}
      />
      <Outlet />
    </DashboardContent>
  )
};

export default IndividualsDashboardPage;