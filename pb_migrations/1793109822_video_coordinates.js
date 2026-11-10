/// <reference path="../pb_data/types.d.ts" />
// Add lat/long coordinates, UTM zone/hemisphere and the coordinate system in use to videos (issue #59)
migrate((app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.add(new NumberField({ name: "latitude", min: -90, max: 90 }));
  videos.fields.add(new NumberField({ name: "longitude", min: -180, max: 180 }));
  videos.fields.add(new NumberField({ name: "utm_zone", min: 1, max: 60, onlyInt: true }));
  // Hemisphere is stored separately from the zone since e.g. "29S" is ambiguous with MGRS latitude bands
  videos.fields.add(new SelectField({ name: "utm_hemisphere", values: ["N", "S"], maxSelect: 1 }));

  // Which of the two coordinate systems a video uses; only that system's fields are shown in the edit form
  videos.fields.add(new SelectField({ name: "coordinate_system", values: ["latlong", "utm"], maxSelect: 1 }));

  app.save(videos);

  // Existing UTM coordinates (from the initial user) were all in zone 29 north, previously hardcoded in the frontend
  app.db().newQuery(
    "UPDATE videos SET utm_zone = 29, utm_hemisphere = 'N', coordinate_system = 'utm' WHERE utm_easting != 0 OR utm_northing != 0"
  ).execute();
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.removeByName("latitude");
  videos.fields.removeByName("longitude");
  videos.fields.removeByName("utm_zone");
  videos.fields.removeByName("utm_hemisphere");
  videos.fields.removeByName("coordinate_system");

  return app.save(videos);
});
