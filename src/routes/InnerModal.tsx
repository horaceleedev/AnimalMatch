import React from 'react'
import IndividualDetailModal from './IndividualDetailModal';
import VideoDetailModal from './VideoDetailModal';
import CropDetailModal from './CropDetailModal';
import { RecordType } from '../types';

interface InnerModalProps {
  type?: RecordType;
  id?: string;
  exitModal: () => void;
}

const InnerModal: React.FC<InnerModalProps> = ({ type, id, exitModal }) => {
  if (id === undefined || type === undefined) return <></>;
  switch (type) {
    case 'individual':
      return (
        <IndividualDetailModal id={id} exitModal={exitModal} />
      )
    case 'video':
      return (
        <VideoDetailModal id={id} exitModal={exitModal} />
      )
    case 'crop':
      return (
        <CropDetailModal id={id} exitModal={exitModal} />
      )
  }
};

export default InnerModal;