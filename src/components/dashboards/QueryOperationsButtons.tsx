import { useMemo } from "react";
import type { FC, ReactNode } from "react";
import { Button, Input, Popover, Select, Space, Switch } from "antd";
import { QueryBuilderDnD } from "@react-querybuilder/dnd";
import * as ReactDnD from "react-dnd";
import * as ReactDndHtml5Backend from "react-dnd-html5-backend";
import type { Field, RuleGroupType, RuleType } from "react-querybuilder";
import { QueryBuilder } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import { QueryBuilderAntD } from "@react-querybuilder/antd";

import Icon, {
  CloseOutlined,
  FilterOutlined,
  GroupOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import SwapVert from "../../assets/material_symbols/swap_vert_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import type { MetadataFieldsType } from "../../types.ts";
import "./QueryOperationsButtons.scss";
import { useSelectionStore } from "../../hooks/useSelectionStore.ts";
import { BatchEditPopup } from "../ui/BatchEditPopup.tsx";

type FieldSelectorProps = {
  metadataFields: MetadataFieldsType;
  value: string;
  onChange: (x: string) => void;
};

type FieldOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type OptionRenderData = {
  data?: FieldOption;
  label?: ReactNode;
  value?: string | number | null;
};

const FieldSelector: FC<FieldSelectorProps> = ({
  metadataFields,
  value,
  onChange,
}: FieldSelectorProps) => {
  const fieldOptions = useMemo<FieldOption[]>(
    () =>
      Object.entries(metadataFields).map(([fieldValue, field]) => ({
        value: fieldValue,
        label: field.displayName,
        icon: field.icon,
      })),
    [metadataFields],
  );

  const optionRender = (option: OptionRenderData): ReactNode => (
    <Space>
      {option.data?.icon} {option.label}
    </Space>
  );
  const labelRender = (option: OptionRenderData): ReactNode => {
    const fieldKey = String(option.value ?? "");
    const icon = metadataFields[fieldKey]?.icon;
    return (
      <Space>
        {icon} {option.label}
      </Space>
    );
  };

  return (
    <Select
      showSearch
      placeholder="Select a field"
      optionFilterProp="label"
      value={value}
      onChange={onChange}
      options={fieldOptions}
      optionRender={optionRender}
      labelRender={labelRender}
      popupMatchSelectWidth={false}
      style={{ minWidth: 150 }}
    />
  );
};

type CustomQueryBuilderProps = {
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  query: RuleGroupType;
  setQuery: (x: RuleGroupType) => void;
};
const CustomQueryBuilder: FC<CustomQueryBuilderProps> = ({
  metadataFields,
  uniqueValuesPerField,
  query,
  setQuery,
}) => {
  const fields = useMemo(() => {
    if (Object.keys(uniqueValuesPerField).length === 0) return [];
    return Object.entries(metadataFields).map(([fieldValue, field]) => {
      const output: Field = {
        name: fieldValue,
        label: field.displayName,
        icon: field.icon,
        datatype: field.type,
        inputType: field.inputType,
        valueEditorType: field.valueEditorType,
        operators: [{ name: "=", value: "=", label: "=" }],
        defaultOperator: "=",
      };
      if (
        field.valueEditorType === "select" ||
        field.valueEditorType === "multiselect"
      ) {
        const values = uniqueValuesPerField[fieldValue] ?? field.presetOptions ?? [];
        output.values = values.map((x) => ({
          name: x,
          value: x,
          label: x,
        }));
      }
      if (field.type === "boolean") {
        output.values = [
          {
            name: true,
            value: true,
            label: field.displayBooleanValuesAs?.[1] ?? "True",
          },
          {
            name: false,
            value: false,
            label: field.displayBooleanValuesAs?.[0] ?? "False",
          },
        ] as unknown as Field["values"];
      }
      if (field.type === "rich_text") {
        output.datatype = "text";
      }
      return output;
    });
  }, [metadataFields, uniqueValuesPerField]);

  console.log(query);

  return (
    <QueryBuilderDnD dnd={{ ...ReactDnD, ...ReactDndHtml5Backend }}>
      <QueryBuilderAntD>
        <QueryBuilder
          fields={fields}
          query={query}
          onQueryChange={setQuery}
          addRuleToNewGroups
          listsAsArrays
          parseNumbers="strict-limited"
          showCombinatorsBetweenRules
        />
      </QueryBuilderAntD>
    </QueryBuilderDnD>
  );
};

type QueryOperationsButtonsProps = {
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  sortFields: string[];
  setSortFields: (x: string[]) => void;
  sortOrders: ("asc" | "desc")[];
  setSortOrders: (x: ("asc" | "desc")[]) => void;
  groupFields: string[];
  setGroupFields: (x: string[]) => void;
  groupOrders: ("asc" | "desc")[];
  setGroupOrders: (x: ("asc" | "desc")[]) => void;
  query: RuleGroupType;
  setQuery: (x: RuleGroupType) => void;
  handleSearch: (x: string) => void;
};

const QueryOperationsButtons: FC<QueryOperationsButtonsProps> = ({
  metadataFields,
  uniqueValuesPerField,
  sortFields,
  setSortFields,
  sortOrders,
  setSortOrders,
  groupFields,
  setGroupFields,
  groupOrders,
  setGroupOrders,
  query,
  setQuery,
  handleSearch,
}: QueryOperationsButtonsProps) => {
  const { selectedItems, selectionMode, toggleSelectionMode } = useSelectionStore();
  const firstFilterRule = useMemo(
    () =>
      query.rules.find(
        (rule): rule is RuleType =>
          typeof rule === "object" && rule !== null && !("rules" in rule),
      ),
    [query.rules],
  );

  const handleSortFieldSelect = (val: string) => {
    setSortFields([val]);
    if (sortOrders.length > 0) {
      setSortOrders([sortOrders[0]]);
    } else {
      setSortOrders(["asc"]);
    }
  };
  const handleGroupFieldSelect = (val: string) => {
    setGroupFields([val]);
    if (groupOrders.length > 0) {
      setGroupOrders([groupOrders[0]]);
    } else {
      setGroupOrders(["asc"]);
    }
  };

  const clearSort = () => {
    setSortFields([]);
    setSortOrders([]);
  };
  const clearGroup = () => {
    setGroupFields([]);
    setGroupOrders([]);
  };

  return (
    <Space size="small" style={{ marginBottom: 10 }}>
      {/* Search input */}
      <Input
        placeholder="Search"
        prefix={<SearchOutlined />}
        allowClear
        onChange={(event) => handleSearch(event.target.value)}
        style={{ minWidth: 300 }}
      />

      {/* Sort button and popover */}
      <Popover
        title={groupFields.length > 0 ? "Sort within groups by" : "Sort by"}
        content={
          <Space>
            <FieldSelector
              metadataFields={metadataFields}
              value={sortFields[0]}
              onChange={handleSortFieldSelect}
            />
            {sortFields.length > 0 && (
              <>
                <Select
                  value={sortOrders[0]}
                  onChange={(val: string) =>
                    setSortOrders([val as "asc" | "desc"])
                  }
                  options={[
                    { value: "asc", label: "Ascending" },
                    { value: "desc", label: "Descending" },
                  ]}
                />
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => clearSort()}
                />
              </>
            )}
          </Space>
        }
        trigger="click"
        arrow={false}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<Icon component={SwapVert} />}
          color={sortFields.length > 0 ? "primary" : "default"}
          variant={sortFields.length > 0 ? "filled" : "text"}
        >
          {sortFields.length > 0
            ? `Sorted by ${metadataFields[sortFields[0]]?.displayName ?? sortFields[0]}`
            : "Sort"}
        </Button>
      </Popover>

      {/* Filter button and popover */}
      <Popover
        title="Filter"
        content={
          <Space>
            <CustomQueryBuilder
              metadataFields={metadataFields}
              uniqueValuesPerField={uniqueValuesPerField}
              query={query}
              setQuery={setQuery}
            />
            {/* <FieldSelector metadataFields={metadataFields} value={groupFields[0]} onChange={handleGroupFieldSelect} />
          {
            groupFields.length > 0 &&
              <>
                <Select
                  value={groupOrders[0]}
                  onChange={(val: string) => setGroupOrders([val])}
                  options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
                />
                <Button type="text" icon={<CloseOutlined />} onClick={() => clearGroup()} />
              </>
          } */}
          </Space>
        }
        trigger="click"
        arrow={false}
        placement="bottomLeft"
      >
        {/* <Button type="text" icon={<GroupOutlined />} color={(groupFields.length > 0) ? "primary" : "default"} variant={(groupFields.length > 0) ? "filled" : "text"}>
          {(groupFields.length > 0) ? `Grouped by ${metadataFields[groupFields[0]].displayName}` : "Group"}
        </Button> */}
        <Button
          type="text"
          icon={<FilterOutlined />}
          color={firstFilterRule ? "primary" : "default"}
          variant={firstFilterRule ? "filled" : "text"}
        >
          {firstFilterRule
            ? `Filtered by ${metadataFields[firstFilterRule.field]?.displayName ?? firstFilterRule.field}`
            : "Filter"}
        </Button>
      </Popover>

      {/* Group button and popover */}
      <Popover
        title="Group by"
        content={
          <Space>
            <FieldSelector
              metadataFields={metadataFields}
              value={groupFields[0]}
              onChange={handleGroupFieldSelect}
            />
            {groupFields.length > 0 && (
              <>
                <Select
                  value={groupOrders[0]}
                  onChange={(val: string) =>
                    setGroupOrders([val as "asc" | "desc"])
                  }
                  options={[
                    { value: "asc", label: "Ascending" },
                    { value: "desc", label: "Descending" },
                  ]}
                />
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => clearGroup()}
                />
              </>
            )}
          </Space>
        }
        trigger="click"
        arrow={false}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<GroupOutlined />}
          color={groupFields.length > 0 ? "primary" : "default"}
          variant={groupFields.length > 0 ? "filled" : "text"}
        >
          {groupFields.length > 0
            ? `Grouped by ${metadataFields[groupFields[0]]?.displayName ?? groupFields[0]}`
            : "Group"}
        </Button>
      </Popover>

      {/* Selection mode toggle */}
      <Switch
        checkedChildren={`Selected ${selectedItems.size}`}
        unCheckedChildren="Select"
        onChange={toggleSelectionMode}
        checked={selectionMode}
      />

      {/* Batch edit button and popover */}
      <BatchEditPopup
        selectionMode={selectionMode}
        selectedItems={selectedItems}
        uniqueValuesPerField={uniqueValuesPerField}
      />
    </Space>
  );
};

export default QueryOperationsButtons;
