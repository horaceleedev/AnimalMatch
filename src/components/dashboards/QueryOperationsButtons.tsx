import React, { useMemo } from 'react'
import { Button, Input, Popover, Select, Space } from "antd";
import type { SelectProps } from 'antd';
import { QueryBuilderDnD } from '@react-querybuilder/dnd';
import * as ReactDnD from 'react-dnd';
import * as ReactDndHtml5Backend from 'react-dnd-html5-backend';
import type { RuleGroupType, ValueEditorProps } from 'react-querybuilder';
import { QueryBuilder } from 'react-querybuilder';
// import { fields } from './fields';
import 'react-querybuilder/dist/query-builder.scss';
import { AntDValueEditor, QueryBuilderAntD } from '@react-querybuilder/antd';
import type { DefaultOptionType, LabelInValueType } from 'rc-select/lib/Select';

import Icon, { CloseCircleOutlined, CloseOutlined, FilterOutlined, GroupOutlined } from "@ant-design/icons";
import SwapVert from '../../assets/material_symbols/swap_vert_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';

import type { MetadataFieldsType } from "../../types.ts";
import { buildQueryBuilderFields } from '../../lib/filtering/filterBuilderConfig.ts';
import { IndividualLinkButton, UserLabel, VideoLinkButton } from '../smart-components/LinkButtons.tsx';
import AnnotationStatusLabel from '../ui/AnnotationStatusLabel.tsx';
import "./QueryOperationsButtons.scss";

type FieldSelectorProps = {
  metadataFields: MetadataFieldsType;
  value: string;
  onChange: (x: string) => void;
};
type FieldOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};
type FieldSelectProps = SelectProps<string, FieldOption>;

const FieldSelector: React.FC<FieldSelectorProps> = ({
  metadataFields,
  value, onChange,
}: FieldSelectorProps) => {
  const fieldOptions = useMemo(
    (): FieldOption[] => Object.entries(metadataFields).map(([fieldValue, field]) => ({
      value: fieldValue,
      label: field.displayName,
      icon: field.icon,
    })),
    [metadataFields]
  );

  const optionRender: NonNullable<FieldSelectProps['optionRender']> = (option) => (
    <Space>{option.data.icon} {option.label}</Space>
  );
  const labelRender: NonNullable<FieldSelectProps['labelRender']> = (option) => {
    const fieldValue = String(option.value);
    return <Space>{metadataFields[fieldValue]?.icon} {option.label}</Space>;
  };
  
  return <Select
    showSearch
    placeholder="Select a field"
    optionFilterProp="label"
    value={value}
    onChange={onChange}
    options={fieldOptions}
    optionRender={optionRender}
    labelRender={labelRender}
    popupMatchSelectWidth={false}
    style={{minWidth: 150}}
  />
};



type CustomQueryBuilderProps = {
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  query: RuleGroupType;
  setQuery: (x: RuleGroupType) => void;
};

type QueryBuilderFieldData = {
  renderType?: MetadataFieldsType[string]['renderType'];
};

const normalizeMultiSelectValue = (value: ValueEditorProps['value']) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    if (value.length === 0) return [];
    return value.split(',').map(part => part.trim()).filter(Boolean);
  }
  return [];
};

const renderDropdownOption = (
  renderType: NonNullable<MetadataFieldsType[string]['renderType']>,
  option: DefaultOptionType
) => {
  const id = String(option.value ?? '');

  if (renderType === 'video_link') {
    return <VideoLinkButton id={id} disableNavigation />;
  }
  if (renderType === 'individual_link') {
    return <IndividualLinkButton id={id} disableNavigation />;
  }
  if (renderType === 'user_label') {
    return <UserLabel id={id} />;
  }

  return <AnnotationStatusLabel status={id} />;
};

const renderSelectedValue = (
  renderType: NonNullable<MetadataFieldsType[string]['renderType']>,
  option: DefaultOptionType | LabelInValueType
) => renderDropdownOption(renderType, option as DefaultOptionType);

const RenderAwareValueEditor = (props: ValueEditorProps) => {
  const renderType = (props.fieldData as QueryBuilderFieldData | undefined)?.renderType;

  if (!renderType || (props.type !== 'select' && props.type !== 'multiselect')) {
    return <AntDValueEditor {...props} />;
  }

  if (props.operator === 'null' || props.operator === 'notNull') {
    return null;
  }

  const normalizedOptions = (props.values ?? []).map(option => ({
    value: String(option.value),
    label: option.label ?? option.name ?? option.value,
  }));
  const labelRender: NonNullable<SelectProps['labelRender']> = option =>
    renderSelectedValue(renderType, option);
  const tagRender: NonNullable<SelectProps['tagRender']> = ({ value, closable, onClose }) => (
    <span
      onMouseDown={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{ display: 'inline-flex', alignItems: 'flex-start', marginInlineEnd: 4 }}
    >
      {renderSelectedValue(renderType, { value })}
      {
        closable ?
          <CloseCircleOutlined
            onMouseDown={event => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={onClose}
            style={{ cursor: 'pointer', marginInlineStart: 4, marginTop: 4 }}
          />
        :
          null
      }
    </span>
  );

  return (
    <span title={props.title} className={props.className}>
      <Select
        className="render-aware-select"
        mode={props.type === 'multiselect' ? 'multiple' : undefined}
        popupMatchSelectWidth={false}
        disabled={props.disabled}
        value={props.type === 'multiselect' ? normalizeMultiSelectValue(props.value) : props.value}
        onChange={nextValue => {
          if (props.type === 'multiselect') {
            const values = Array.isArray(nextValue) ? nextValue.map(String) : [];
            props.handleOnChange(props.listsAsArrays ? values : values.join(','));
            return;
          }
          props.handleOnChange(nextValue);
        }}
        options={normalizedOptions}
        optionRender={option => renderDropdownOption(renderType, option.data)}
        labelRender={labelRender}
        tagRender={props.type === 'multiselect' ? tagRender : undefined}
      />
    </span>
  );
};

const CustomQueryBuilder = ({metadataFields, uniqueValuesPerField, query, setQuery}: CustomQueryBuilderProps) => {
  const fields = useMemo(
    () => buildQueryBuilderFields(metadataFields, uniqueValuesPerField),
    [metadataFields, uniqueValuesPerField]
  );

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
          controlElements={{ valueEditor: RenderAwareValueEditor }}
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
}

const QueryOperationsButtons: React.FC<QueryOperationsButtonsProps> = ({
  metadataFields, uniqueValuesPerField,
  sortFields, setSortFields, sortOrders, setSortOrders,
  groupFields, setGroupFields, groupOrders, setGroupOrders,
  query, setQuery
}: QueryOperationsButtonsProps) => {
  const filterLabel = useMemo(() => {
    if (query.rules.length === 0) return "Filter";
    if (query.rules.length === 1) {
      const firstRule = query.rules[0] as { field?: string } | undefined;
      if (firstRule?.field && metadataFields[firstRule.field]) {
        return `Filtered by ${metadataFields[firstRule.field].displayName}`;
      }
    }
    return `${query.rules.length} filters`;
  }, [query.rules, metadataFields]);

  const handleSortFieldSelect = (val: string) => {
    setSortFields([val]);
    if (sortOrders.length > 0) {
      setSortOrders([sortOrders[0]]);
    } else {
      setSortOrders(['asc']);
    }
  };
  const handleGroupFieldSelect = (val: string) => {
    setGroupFields([val]);
    if (groupOrders.length > 0) {
      setGroupOrders([groupOrders[0]]);
    } else {
      setGroupOrders(['asc']);
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
      {/* Search button */}
      <Input.Search placeholder="Search" allowClear onSearch={() => {}} style={{ minWidth: 300 }} />

      {/* Sort button and popover */}
      <Popover title={groupFields.length > 0 ? "Sort within groups by" : "Sort by"} content={
        <Space>
          <FieldSelector metadataFields={metadataFields} value={sortFields[0]} onChange={handleSortFieldSelect} />
          {
            sortFields.length > 0 &&
              <>
                <Select
                  value={sortOrders[0]}
                  onChange={(val: string) => setSortOrders([val as ("asc" | "desc")])}
                  options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
                />
                <Button type="text" icon={<CloseOutlined />} onClick={() => clearSort()} />
              </>
          }
        </Space>
      } trigger="click" arrow={false} placement="bottomLeft" >
        <Button type="text" icon={<Icon component={SwapVert} />} color={(sortFields.length > 0) ? "primary" : "default"} variant={(sortFields.length > 0) ? "filled" : "text"}>
          {(sortFields.length > 0) ? `Sorted by ${metadataFields[sortFields[0]].displayName}` : "Sort"}
        </Button>
      </Popover>

      {/* Filter button and popover */}
      <Popover title="Filter" content={
        <Space>
          <CustomQueryBuilder metadataFields={metadataFields} uniqueValuesPerField={uniqueValuesPerField} query={query} setQuery={setQuery} />
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
      } trigger="click" arrow={false} placement="bottomLeft" >
        {/* <Button type="text" icon={<GroupOutlined />} color={(groupFields.length > 0) ? "primary" : "default"} variant={(groupFields.length > 0) ? "filled" : "text"}>
          {(groupFields.length > 0) ? `Grouped by ${metadataFields[groupFields[0]].displayName}` : "Group"}
        </Button> */}
        <Button type="text" icon={<FilterOutlined />}
          color={(query.rules.length > 0) ? "primary" : "default"}
          variant={(query.rules.length > 0) ? "filled" : "text"}
        >
          {filterLabel}
        </Button>
      </Popover>

      {/* Group button and popover */}
      <Popover title="Group by" content={
        <Space>
          <FieldSelector metadataFields={metadataFields} value={groupFields[0]} onChange={handleGroupFieldSelect} />
          {
            groupFields.length > 0 &&
              <>
                <Select
                  value={groupOrders[0]}
                  onChange={(val: string) => setGroupOrders([val as ("asc" | "desc")])}
                  options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
                />
                <Button type="text" icon={<CloseOutlined />} onClick={() => clearGroup()} />
              </>
          }
        </Space>
      } trigger="click" arrow={false} placement="bottomLeft" >
        <Button type="text" icon={<GroupOutlined />} color={(groupFields.length > 0) ? "primary" : "default"} variant={(groupFields.length > 0) ? "filled" : "text"}>
          {(groupFields.length > 0) ? `Grouped by ${metadataFields[groupFields[0]].displayName}` : "Group"}
        </Button>
      </Popover>
    </Space>
  )
};

export default QueryOperationsButtons;
