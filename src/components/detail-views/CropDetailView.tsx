import React from 'react';
import { Button, Flex, Image, Tooltip } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';

// import Compare from '../assets/material_symbols/compare_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import RecordMetadataForm from './RecordMetadataForm.tsx';
import { cropsMetadataFields } from '../../metadata.tsx';
import { Crop, RecordType } from '../../types.ts';

const FEATURED_BORDER_COLOR = '#faad14';

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
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Image
            src={crop.imageUrl}
            style={{
              height: 300,
              objectFit: 'contain',
              outline: crop.is_featured ? `2px solid ${FEATURED_BORDER_COLOR}` : undefined,
              borderRadius: 4,
            }}
          />
          <Tooltip title={crop.is_featured ? 'Remove from featured' : 'Mark as featured'}>
            <Button
              type="text"
              size="small"
              icon={
                crop.is_featured
                  ? <StarFilled style={{ color: FEATURED_BORDER_COLOR }} />
                  : <StarOutlined style={{ color: 'white' }} />
              }
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 4,
              }}
              onClick={() => updateCrop(crop.id, { is_featured: !crop.is_featured })}
            />
          </Tooltip>
        </div>
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
