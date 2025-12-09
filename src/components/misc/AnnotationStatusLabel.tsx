import { useMemo } from "react";
import { Space } from "antd";
import { startCase } from "es-toolkit";

import { videoMetadataFields } from "../../metadata";

const defaultDotStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
};
const largeDotStyle = {
  marginLeft: 3,
  marginRight: 3,
};

const AnnotationStatusLabel = ({ status, largeSize = false }: { status: string, largeSize?: boolean }) => {
  const displayedStatus = useMemo(() => startCase(status), [status]);
  return (
    <Space size={largeSize ? 10 : undefined}>
      {/* Dot indicator */}
      <div style={{ ...defaultDotStyle, ...(largeSize ? largeDotStyle : {}), backgroundColor: videoMetadataFields['annotation_status'].extraData!.colorMapping[status] }} ></div>
      {displayedStatus}
    </Space>
  );
};

export default AnnotationStatusLabel;