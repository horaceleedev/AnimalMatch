import React from 'react';
import { Flex, Image } from 'antd';

// import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import RecordMetadataForm from './RecordMetadataForm.tsx';
import { cropsMetadataFields } from '../../metadata.tsx';
import { Crop, RecordType } from '../../types.ts';

type CropDetailViewProps = {
  crop: Crop;
  uniqueValuesPerField: Record<string, string[]>;
  videoLinkTemplate?: string;
  individualLinkTemplate?: string;
  openModal?: (type: RecordType, id: string) => void;
  updateCrop: (id: string, data: Partial<Crop>) => Promise<Crop>;
}

const CropDetailView: React.FC<CropDetailViewProps> = ({
  crop,
  uniqueValuesPerField,
  videoLinkTemplate,
  individualLinkTemplate,
  openModal,
  updateCrop,
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
        videoLinkTemplate={videoLinkTemplate}
        individualLinkTemplate={individualLinkTemplate}
        openModal={openModal}
        updateFunction={updateCrop}
        showIconInSelectionFields={false}
      />
    </>
  );
};

export default CropDetailView;