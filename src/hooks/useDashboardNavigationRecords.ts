import { useCallback, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { Crop, Individual, Video } from '../types.ts';

export type DashboardNavigationOutletContext = {
  videos?: Video[];
  individuals?: Individual[];
  crops?: Crop[];
};

type NavigationContextKey = keyof DashboardNavigationOutletContext;
type NavigationRecord = Video | Individual | Crop;

/**
 * Manages a cached list of records used for the previous/next navigation buttons in detail views.
 *
 * The list is updated when the input list of records (`defaultNavigationRecords`)
 * changes while the user is on the dashboard page, such as when the sider
 * selection is changed. It is also updated via the `updateNavigationRecords`
 * callback, which can be called by a child view component when its own internal
 * filtered list changes (e.g. after a text search inside the view).
 * It is NOT updated while the user is inside a detail view, to ensure a
 * consistent navigation experience when editing record metadata.
 *
 * @param defaultNavigationRecords - The current filtered list of records from the dashboard (sider filters applied)
 * @param dashboardPath - The route path pattern for the dashboard page (e.g. "/videos", "/individuals")
 * @param contextKey - The key to use in the outlet context for the navigation records (e.g. "videos", "individuals")
 * @returns An object with:
 *   - `outletContext`: The context object to pass to the <Outlet> component, containing the current navigation records
 *   - `updateNavigationRecords`: Callback to update the navigation list when a
 *      view's internal filtered list changes, or when a record within a group is selected
 */
function useDashboardNavigationRecords<
  T extends NavigationRecord,
  K extends NavigationContextKey,
>(
  defaultNavigationRecords: T[],
  dashboardPath: string,
  contextKey: K,
) {
  const [navigationRecords, setNavigationRecords] = useState<T[]>(defaultNavigationRecords);
  const { pathname } = useLocation();
  const isDashboardRoute = Boolean(matchPath(dashboardPath, pathname));

  // Keep navigation records updated while the user is on the dashboard page
  useEffect(() => {
    if (!isDashboardRoute) return;
    setNavigationRecords(defaultNavigationRecords);
  }, [defaultNavigationRecords, isDashboardRoute]);

  // Used in *DashboardViews to update the navigation records
  // when the filtered records change (e.g., due to search or filtering)
  // or when a record within a group is selected
  const updateNavigationRecords = useCallback((records: T[]) => {
    if (!isDashboardRoute) return;
    setNavigationRecords(records);
  }, [isDashboardRoute]);

  const outletContext = useMemo(
    () => ({
      [contextKey]: navigationRecords as DashboardNavigationOutletContext[K],
    }) as Pick<DashboardNavigationOutletContext, K>,
    [contextKey, navigationRecords],
  );

  return {
    outletContext,
    updateNavigationRecords,
  };
}

export default useDashboardNavigationRecords;