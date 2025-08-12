import React, { useState } from 'react'
import { Outlet } from 'react-router-dom';

import { useIndividualsStore, useVideoStore } from '../DataStores.tsx';
import { individualsMetadataFields } from '../metadata.tsx';
import IndividualsDashboardView from '../components/IndividualsDashboardView.tsx';

const IndividualsDashboardPage: React.FC = () => {
  const individuals = useIndividualsStore((state) => state.individuals);
  const uniqueValuesPerField = useIndividualsStore((state) => state.uniqueValuesPerField);
  const videos = useVideoStore((state) => state.videos);

  return (
    <>
      <IndividualsDashboardView
        individuals={individuals}
        videos={videos}
        uniqueValuesPerField={uniqueValuesPerField}
        individualsMetadataFields={individualsMetadataFields}
      />
      <Outlet />
    </>
  )
};

export default IndividualsDashboardPage;