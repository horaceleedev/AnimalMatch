import { ComponentType, useMemo, useState } from "react";
import { RecordModel } from "pocketbase";
import { groupBy, orderBy } from "es-toolkit";
import { Collapse, Space, Pagination } from "antd";

import { IndividualLinkButton, UserLabel, VideoLinkButton } from "../smart-components/LinkButtons";
import AnnotationStatusLabel from "../ui/AnnotationStatusLabel";
import { MetadataFieldsType, RecordType } from "../../types";

interface BasicGridViewProps {
  openModal?: (type: RecordType, id: string) => void
};

type SortOrder = "asc" | "desc";

interface SortingGroupingOptions<T> {
  sortFields?: string[];
  sortOrders?: SortOrder[];
  groupFields?: string[];
  groupOrders?: SortOrder[];
  onSelectGroup?: (groupRecords: T[]) => void;
};

const withSortingAndGrouping = <P extends BasicGridViewProps, T extends RecordModel>(
  BasicGridView: ComponentType<P>,
  opts: {
    processedRecordsProp: keyof P & string; // e.g. 'individuals', 'videos', 'crops'
    metadataFieldsProp: keyof P & string;
  },
) => {
  return (props: P & SortingGroupingOptions<T>) => {
    if (!(opts.processedRecordsProp in props)) {
      throw new Error(`Missing prop "${opts.processedRecordsProp}" in ${BasicGridView.displayName || BasicGridView.name || "BasicGridView"} wrapped by withSortingAndGrouping`);
    }
    const processedRecords = props[opts.processedRecordsProp] as T[];
    const metadataFields = props[opts.metadataFieldsProp] as MetadataFieldsType;

    const sortFields = props.sortFields ?? [];
    const sortOrders = props.sortOrders ?? [] as SortOrder[];
    const groupFields = props.groupFields ?? [];
    const groupOrders = props.groupOrders ?? [] as SortOrder[];

    const recordsSorted = useMemo(
      () => orderBy(processedRecords, sortFields, sortOrders),
      [processedRecords, sortFields, sortOrders],
    );

    // TODO check if the below works when groupFields.length === 0
    const groupedRecords: [any, T[]][] = useMemo(
      () => orderBy(
        Object.entries(groupBy<T, any>(recordsSorted, (record) => record[groupFields[0]])),
        [([groupValue, _]) => groupValue],
        [groupOrders[0]],
      ),
      [recordsSorted, groupFields, groupOrders],
    );
    
    if (groupFields.length === 0) {
      const basicProps = {
        ...props,
        [opts.processedRecordsProp]: recordsSorted, // override with sorted records
      } as P;
      return <BasicGridView {...basicProps} />;
    }
    return groupedRecords.map(([groupValue, groupRecords]) => {
      const onSelectGroupRecord = () => {
        props.onSelectGroup?.(groupRecords);
      };
      let renderedGroupValue = groupValue;
      const renderType = metadataFields[groupFields[0]].renderType;
      if (renderType === 'video_link') {
        renderedGroupValue = (
          <VideoLinkButton
            id={groupValue as string}
            // TODO pass linkTemplate in
            // linkTemplate={videoLinkTemplate}
            openModal={props.openModal}
          />
        );
      } else if (renderType === 'individual_link') {
        renderedGroupValue = (
          <IndividualLinkButton
            id={groupValue as string}
            // TODO pass linkTemplate in
            // linkTemplate={individualLinkTemplate}
            openModal={props.openModal}
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

      const basicGridViewProps = {
        ...props,
        [opts.processedRecordsProp]: groupRecords, // override with group records
      } as P;

      return (
        <Collapse
          key={groupValue}
          collapsible="header"
          defaultActiveKey={['1']}
          style={{
            marginBottom: 12,
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
                <BasicGridView {...basicGridViewProps} onSelectRecord={onSelectGroupRecord} />
              ),
              styles: {
                body: {
                  maxHeight: "calc(100vh - 64px - 46px - 50px)", // viewport height - app header height - collapse header height - some margin
                  overflowY: "scroll",
                }
              }
            },
          ]}
          // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          // style={{ background: token.colorBgContainer }}
        />
      );
    });
  };
};


const withPagination = <P extends BasicGridViewProps, T extends RecordModel>(
  BasicGridView: ComponentType<P>,
  {
    processedRecordsProp,
    pageSize = 50,
  }: {
    processedRecordsProp: keyof P & string; // e.g. 'individuals', 'videos', 'crops'
    pageSize?: number;
  },
) => {
  return (props: P) => {
    if (!(processedRecordsProp in props)) {
      throw new Error(`Missing prop "${processedRecordsProp}" in ${BasicGridView.displayName || BasicGridView.name || "BasicGridView"} wrapped by withPagination`);
    }

    const [currentPageNum, setcurrentPageNum] = useState(1); // 1-based index for Pagination component
    const processedRecords = props[processedRecordsProp] as T[];

    const startIndex = (currentPageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = processedRecords.slice(startIndex, endIndex);

    return (
      <div>
        <BasicGridView {...props} {...{ [processedRecordsProp]: paginatedRecords }} />
        {
          // Only show pagination buttons if there is more than one page of records
          (processedRecords.length > pageSize) && 
          <Pagination
            simple
            current={currentPageNum}
            onChange={(page: number) => setcurrentPageNum(page)}
            total={processedRecords.length}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            pageSize={pageSize}
            showSizeChanger={false}
            align="center"
            style={{ marginTop: 16 }}
          />
        }
      </div>
    );
  };
};


// Combined HOC
const withSortingGroupingAndPagination = <P extends BasicGridViewProps, T extends RecordModel>(
  BasicGridView: ComponentType<P>,
  opts: {
    processedRecordsProp: keyof P & string; // e.g. 'individuals', 'videos', 'crops'
    metadataFieldsProp: keyof P & string;
    pageSize?: number;
  },
) => {
  return withSortingAndGrouping<P, T>(
    withPagination<P, T>(
      BasicGridView,
      { processedRecordsProp: opts.processedRecordsProp, pageSize: opts.pageSize }
    ),
    { processedRecordsProp: opts.processedRecordsProp, metadataFieldsProp: opts.metadataFieldsProp }
  );
};

export default withSortingGroupingAndPagination;