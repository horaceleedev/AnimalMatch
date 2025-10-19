import React from 'react';
import { Flex, Image } from 'antd';

import RecordMetadataForm from '../components/RecordMetadataForm.tsx';
import { cropsMetadataFields } from '../metadata.tsx';
import { Crop } from '../types.ts';

type CropDetailViewProps = {
  crop: Crop;
  uniqueValuesPerField: Record<string, string[]>;
  updateCrop: (id: string, data: Partial<Crop>) => Promise<void>;
}

const CropDetailView: React.FC<CropDetailViewProps> = ({
  crop,
  uniqueValuesPerField,
  updateCrop
}: CropDetailViewProps) => {
  return (
    <>
      <Flex justify="center" style={{marginBottom: 10}}>
        <Image src={crop.imageUrl} style={{height: 300, objectFit: 'contain'}} />
      </Flex>
      <RecordMetadataForm
        processedRecord={crop}
        metadataFields={cropsMetadataFields}
        uniqueValuesPerField={uniqueValuesPerField}
        updateFunction={updateCrop}
        showIconInSelectionFields={false}
      />
    </>
  );
};

export default CropDetailView;