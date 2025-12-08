import { ComponentType, useMemo } from "react";
import { RecordModel } from "pocketbase";
import { groupBy, orderBy } from "es-toolkit";
import { Collapse, Space } from "antd";

import { IndividualLinkButton, UserLabel, VideoLinkButton } from "./smart-components/LinkButtons";
import AnnotationStatusLabel from "./AnnotationStatusLabel";
import { MetadataFieldsType, RecordType } from "../types";

interface BasicGridViewProps {
  openModal?: (type: RecordType, id: string) => void
};

interface OuterProps<T> {
  processedRecords: T[];
  metadataFields: MetadataFieldsType;
  processedRecordsPropName: string; // e.g. 'individuals', 'videos', 'crops'
  sortFields: string[];
  sortOrders: ("asc" | "desc")[];
  groupFields: string[];
  groupOrders: ("asc" | "desc")[];
  onSelectGroup?: (groupRecords: T[]) => void;
};

const withSortingAndGrouping = <P extends BasicGridViewProps, T extends RecordModel>(
  BasicGridView: ComponentType<P>
) => {
  return ({
    processedRecords,
    metadataFields,
    processedRecordsPropName,
    sortFields,
    sortOrders,
    groupFields,
    groupOrders,
    basicGridViewProps,
    onSelectGroup,
  }: OuterProps<T> & { basicGridViewProps: P }) => {
    const recordsSorted = useMemo(
      () => orderBy(processedRecords, sortFields, sortOrders),
      [processedRecords, sortFields, sortOrders],
    );

    // TODO check if the below works when groupFields.length === 0
    const groupedRecords: [any, T[]][] = useMemo(
      () => orderBy(
        Object.entries(groupBy<T, any>(recordsSorted, record => record[groupFields[0]])),
        [([groupValue, _]) => groupValue],
        [groupOrders[0]],
      ),
      [recordsSorted, groupFields, groupOrders],
    );

    if (groupFields.length === 0) {
      return <BasicGridView {...basicGridViewProps} {...{[processedRecordsPropName]: recordsSorted}} />;
    }
    return groupedRecords.map(([groupValue, groupRecords]) => {
      const onSelectGroupRecord = () => {
        onSelectGroup?.(groupRecords);
      };
      let renderedGroupValue = groupValue;
      const renderType = metadataFields[groupFields[0]].renderType;
      if (renderType === 'video_link') {
        renderedGroupValue = (
          <VideoLinkButton
            id={groupValue as string}
            // TODO pass linkTemplate in
            // linkTemplate={videoLinkTemplate}
            openModal={basicGridViewProps.openModal}
          />
        );
      } else if (renderType === 'individual_link') {
        renderedGroupValue = (
          <IndividualLinkButton
            id={groupValue as string}
            // TODO pass linkTemplate in
            // linkTemplate={individualLinkTemplate}
            openModal={basicGridViewProps.openModal}
          />
        );
      } else if (renderType === 'user_label') {
        if (metadataFields[groupFields[0]].valueEditorType === 'multiselect') {
          const userIds: string[] = groupRecords[0][groupFields[0]];
          renderedGroupValue = userIds.map(val => (
            <UserLabel id={val} />
          ));
        } else {
          renderedGroupValue = <UserLabel id={groupValue as string} />;
        }
      } else if (renderType === 'annotation_status_label') {
        renderedGroupValue = <AnnotationStatusLabel status={groupValue as string} />;
      }

      return (
        <Collapse
          key={groupValue}
          collapsible="header"
          defaultActiveKey={['1']}
          style={{
            marginBottom: 12
          }}
          items={[
            {
              key: '1',
              label:  (
                (metadataFields[groupFields[0]].displayBooleanValuesAs) ? 
                // Use 'displayBooleanValuesAs'
                <span>{metadataFields[groupFields[0]].displayBooleanValuesAs?.[Number(groupValue === 'true')]}</span>
                :
                // the <Space> helps with rendering multiple <UserLabel>'s, and
                // preventing <VideoLinkButton> and <IndividualLinkButton> from taking up the full width
                <Space>
                  <span>{metadataFields[groupFields[0]].displayName}:</span>
                  {renderedGroupValue}
                </Space>
              ),
              children: (
                <BasicGridView {...basicGridViewProps} {...{[processedRecordsPropName]: groupRecords}} onSelectRecord={onSelectGroupRecord} />
              ),
            },
          ]}
          // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          // style={{ background: token.colorBgContainer }}
        />
      );
    });
  };
};

export default withSortingAndGrouping;