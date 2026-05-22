import { describe, expect, it, vi } from 'vitest';

import BodyPartSelect from '../../src/components/crops/BodyPartSelect';
import { renderWithProviders, screen, userEvent } from '../helpers/render';

describe('BodyPartSelect', () => {
  it('renders unique body part options and disables unavailable body parts', async () => {
    const setSelectedBodyPart = vi.fn();

    renderWithProviders(
      <BodyPartSelect
        bodyPartOptions={['face', 'ear', 'face']}
        selectedBodyPart=""
        setSelectedBodyPart={setSelectedBodyPart}
        availableBodyParts={new Set(['face'])}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('any body part'));

    expect(screen.getAllByText('face')).toHaveLength(1);
    expect(screen.getByText('ear').closest('.ant-select-item-option')).toHaveClass('ant-select-item-option-disabled');

    await user.click(screen.getByText('face'));

    expect(setSelectedBodyPart).toHaveBeenCalledWith('face');
  });

  it('reports the empty "show all" value when the any-body-part option is selected', async () => {
    const setSelectedBodyPart = vi.fn();

    renderWithProviders(
      <BodyPartSelect
        bodyPartOptions={['face', 'ear']}
        selectedBodyPart="face"
        setSelectedBodyPart={setSelectedBodyPart}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('face'));
    await user.click(screen.getByText('any body part'));

    expect(setSelectedBodyPart).toHaveBeenCalledWith('');
  });
});
