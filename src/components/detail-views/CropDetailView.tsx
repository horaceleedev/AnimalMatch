import React from 'react';
import { Flex } from 'antd';

// import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import RecordMetadataForm from './RecordMetadataForm.tsx';
import CropImage from '../smart-components/CropImage.tsx';
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
        <CropImage
          crop={crop}
          preview
          wrapperStyle={{ display: 'inline-block' }}
          imageStyle={{ height: 300, objectFit: 'contain', borderRadius: 4 }}
        />
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
