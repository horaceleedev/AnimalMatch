import { describe, expect, it, vi } from 'vitest';

import BodyPartSelect, { ANY_BODY_PART } from '../../src/components/crops/BodyPartSelect';
import { renderWithProviders, screen, userEvent } from '../helpers/render';

describe('BodyPartSelect', () => {
  it('renders unique body part options and disables unavailable body parts', async () => {
    const setSelectedBodyPart = vi.fn();

    renderWithProviders(
      <BodyPartSelect
        bodyPartOptions={['face', 'ear', 'face']}
        selectedBodyPart={ANY_BODY_PART}
        setSelectedBodyPart={setSelectedBodyPart}
        availableBodyParts={new Set(['face'])}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText(ANY_BODY_PART));

    expect(screen.getAllByText('face')).toHaveLength(1);
    expect(screen.getByText('ear').closest('.ant-select-item-option')).toHaveClass('ant-select-item-option-disabled');

    await user.click(screen.getByText('face'));

    expect(setSelectedBodyPart).toHaveBeenCalledWith('face', expect.anything());
  });
});
