import React, { useMemo } from "react";
import { RecordModel } from "pocketbase";
import { groupBy, orderBy } from "es-toolkit";
import { Collapse } from "antd";

import { MetadataFieldsType } from "../types";

type OuterProps<T> = {
  processedRecords: T[];
  metadataFields: MetadataFieldsType;
  processedRecordsPropName: string; // e.g. 'individuals', 'videos', 'crops'
  sortFields: string[];
  sortOrders: ("asc" | "desc")[];
  groupFields: string[];
  groupOrders: ("asc" | "desc")[];
};

const withSortingAndGrouping = <P extends object, T extends RecordModel>(
  BasicGridView: React.ComponentType<P>
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
    return groupedRecords.map(([groupValue, groupRecords]) => (
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
              <span>{metadataFields[groupFields[0]].displayBooleanValuesAs[Number(groupValue === 'true')]}</span>
              :
              <span>{metadataFields[groupFields[0]].displayName}: {groupValue}</span>
            ),
            children: (
              <BasicGridView {...basicGridViewProps} {...{[processedRecordsPropName]: groupRecords}} />
            ),
          },
        ]}
        // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        // style={{ background: token.colorBgContainer }}
      />
    ));
  };
};

export default withSortingAndGrouping;