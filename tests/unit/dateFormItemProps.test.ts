import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';

import { dateFormItemProps } from '../../src/components/detail-views/RecordMetadataForm';

const { getValueProps, normalize } = dateFormItemProps;

describe('dateFormItemProps', () => {
  it('round-trips a PocketBase date string through the DatePicker value unchanged', () => {
    const stored = '2026-03-04 05:06:07.000Z';
    const pickerValue = getValueProps!(stored).value;
    expect(dayjs.isDayjs(pickerValue)).toBe(true);
    expect(normalize!(pickerValue, undefined, {})).toBe(stored);
  });

  it('keeps the picked wall-clock time regardless of the local timezone', () => {
    expect(normalize!(dayjs('2026-03-04T05:06:07'), undefined, {})).toBe('2026-03-04 05:06:07.000Z');
  });

  it('maps empty values both ways', () => {
    expect(getValueProps!('').value).toBeNull();
    expect(normalize!(null, undefined, {})).toBe('');
  });
});
