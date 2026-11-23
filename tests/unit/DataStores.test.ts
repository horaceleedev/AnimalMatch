import { describe, expect, it } from 'vitest';

import { useDeploymentsStore, useVideoStore } from '../../src/DataStores';
import type { DeploymentRecord, VideoRecord } from '../../src/types';

describe('video coordinates from deployments', () => {
  it('recomputes video lat/long when deployments change, whichever store loads first', () => {
    useVideoStore.setState({
      unprocessedRecords: [{ id: 'v1', collectionId: 'videos', collectionName: 'videos', deployment: 'd1', recording_date: '' } as VideoRecord],
    });
    useVideoStore.getState().reprocess();
    // Deployments not loaded yet
    expect(useVideoStore.getState().processedRecords[0]).toMatchObject({ lat: null, long: null });

    const deployment = { id: 'd1', coordinate_system: 'latlong', latitude: 11.5, longitude: -15.6 } as DeploymentRecord;
    useDeploymentsStore.setState({ processedRecords: [deployment] });
    expect(useVideoStore.getState().processedRecords[0]).toMatchObject({ lat: 11.5, long: -15.6 });
    expect(useVideoStore.getState().uniqueValuesPerField.deployment).toEqual(['d1']);

    // Editing the deployment moves the video
    useDeploymentsStore.setState({ processedRecords: [{ ...deployment, latitude: 12 }] });
    expect(useVideoStore.getState().processedRecords[0]).toMatchObject({ lat: 12, long: -15.6 });
  });
});
