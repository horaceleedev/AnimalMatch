import { memo } from "react";
import { Crop, Individual, RecordType, Video } from "../../types";
import { generatePath, useNavigate } from "react-router-dom";
import { Button, Flex, Tooltip } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { RecordModel } from "pocketbase";

// Factory function for PrevNextVideoButtons, PrevNextIndividualButtons, PrevNextCropButtons
const makePrevNextRecordButtons = <T extends RecordModel>(recordType: RecordType) => memo(
  ({
    record,
    recordLinkTemplate = `/${recordType}s/:${recordType}Id`, // e.g. /videos/:videoId
    records = [],
    flexProps = {
      gap: "middle",
    },
  }: {
    record: T,
    recordLinkTemplate?: string,
    records?: T[],
    flexProps?: React.ComponentProps<typeof Flex>,
  }) => {
    const navigate = useNavigate();
    const recordIndex = records.findIndex(v => v.id === record.id);
    let nextRecordId = '';
    let prevRecordId = '';
    if (recordIndex < records.length - 1) {
      // If not the last record
      nextRecordId = records[recordIndex + 1].id;
    }
    if (recordIndex > 0) {
      // If not the first record
      prevRecordId = records[recordIndex - 1].id;
    }

    function navigateToRecord(recordId: string) {
      return () => navigate(generatePath(recordLinkTemplate, { [`${recordType}Id`]: recordId }));
    }

    return (
      <Flex {...flexProps}>
        <Tooltip title={"Previous " + recordType}>
          <Button
            aria-label={"Previous " + recordType}
            shape="circle" icon={<LeftOutlined />}
            disabled={!prevRecordId}
            onClick={navigateToRecord(prevRecordId)}
          />
        </Tooltip>
        <Tooltip title={"Next " + recordType}>
          <Button
            aria-label={"Next " + recordType}
            shape="circle"
            icon={<RightOutlined />}
            disabled={!nextRecordId}
            onClick={navigateToRecord(nextRecordId)}
          />
        </Tooltip>
      </Flex>
    );
  }
);

export const PrevNextVideoButtons = makePrevNextRecordButtons<Video>("video");
export const PrevNextIndividualButtons = makePrevNextRecordButtons<Individual>("individual");
export const PrevNextCropButtons = makePrevNextRecordButtons<Crop>("crop");
