/// <reference path="../pb_data/types.d.ts" />
// Add lat/long coordinates and UTM zone/hemisphere to videos (issue #59)
// ponytail: PocketBase stores empty number fields as 0, so 0 means "unset" for all coordinate fields (a real lat/long of exactly 0 can't be stored)
migrate((app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.add(new NumberField({ name: "latitude", min: -90, max: 90 }));
  videos.fields.add(new NumberField({ name: "longitude", min: -180, max: 180 }));
  videos.fields.add(new NumberField({ name: "utm_zone", min: 1, max: 60, onlyInt: true }));
  // Hemisphere is stored separately from the zone since e.g. "29S" is ambiguous with MGRS latitude bands
  videos.fields.add(new SelectField({ name: "utm_hemisphere", values: ["N", "S"], maxSelect: 1 }));

  app.save(videos);

  // Existing UTM coordinates (from the initial user) were all in zone 29 north, previously hardcoded in the frontend
  app.db().newQuery(
    "UPDATE videos SET utm_zone = 29, utm_hemisphere = 'N' WHERE utm_easting != 0 OR utm_northing != 0"
  ).execute();
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.removeByName("latitude");
  videos.fields.removeByName("longitude");
  videos.fields.removeByName("utm_zone");
  videos.fields.removeByName("utm_hemisphere");

  return app.save(videos);
});
