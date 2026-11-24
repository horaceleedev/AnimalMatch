/// <reference path="../pb_data/types.d.ts" />
// Move video location/coordinates into a `deployments` collection (issue #59).
// A deployment is one camera at one location, as in the Camtrap DP standard
// (https://camtrap-dp.tdwg.org/data/#deployments). Spec fields use the spec's camelCase names so an
// export is a straight copy; snake_case fields are our own extensions (Camtrap DP only allows WGS84 lat/long,
// so UTM is kept as entered and converted to lat/long when needed).

const editorOnlyRule = '@request.auth.id != "" && @request.auth.role = "editor"';
const signedInRule = '@request.auth.id != ""';

migrate((app) => {
  const deployments = new Collection({
    id: "am_deployments",
    type: "base",
    name: "deployments",
    listRule: signedInRule,
    viewRule: signedInRule,
    createRule: editorOnlyRule,
    updateRule: editorOnlyRule,
    deleteRule: editorOnlyRule,
    fields: [
      // Camtrap DP fields (deploymentID is the record id)
      { name: "locationID", type: "text" },
      { name: "latitude", type: "number", min: -90, max: 90 },
      { name: "longitude", type: "number", min: -180, max: 180 },
      { name: "cameraID", type: "text" },
      { name: "deploymentComments", type: "editor" },
      // Extensions: which coordinate system was entered, and UTM coordinates as entered.
      // Hemisphere is stored separately from the zone since e.g. "29S" is ambiguous with MGRS latitude bands
      { name: "coordinate_system", type: "select", values: ["latlong", "utm"], maxSelect: 1 },
      { name: "utm_easting", type: "number" },
      { name: "utm_northing", type: "number" },
      { name: "utm_zone", type: "number", min: 1, max: 60, onlyInt: true },
      { name: "utm_hemisphere", type: "select", values: ["N", "S"], maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });
  app.save(deployments);

  const videos = app.findCollectionByNameOrId("videos");
  videos.fields.add(new RelationField({ name: "deployment", collectionId: deployments.id, maxSelect: 1 }));
  app.save(videos);

  // One deployment per distinct location name + coordinates
  const groups = arrayOf(new DynamicModel({
    location_name: "", utm_easting: 0, utm_northing: 0,
  }));
  app.db().newQuery(`
    SELECT location_name, utm_easting, utm_northing
    FROM videos
    WHERE location_name != '' OR utm_easting != 0 OR utm_northing != 0
    GROUP BY location_name, utm_easting, utm_northing
  `).all(groups);

  for (const g of groups) {
    const record = new Record(deployments);
    record.set("locationID", g.location_name);
    if (g.utm_easting || g.utm_northing) {
      // Existing UTM coordinates (from the initial user) were all in zone 29 north, previously hardcoded in the frontend
      record.set("coordinate_system", "utm");
      record.set("utm_easting", g.utm_easting);
      record.set("utm_northing", g.utm_northing);
      record.set("utm_zone", 29);
      record.set("utm_hemisphere", "N");
    }
    app.save(record);

    app.db().newQuery(`
      UPDATE videos SET deployment = {:id}
      WHERE location_name = {:name} AND utm_easting = {:easting} AND utm_northing = {:northing}
    `).bind({ id: record.id, name: g.location_name, easting: g.utm_easting, northing: g.utm_northing }).execute();
  }

  videos.fields.removeByName("location_name");
  videos.fields.removeByName("utm_easting");
  videos.fields.removeByName("utm_northing");
  app.save(videos);
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");
  videos.fields.add(new TextField({ name: "location_name" }));
  videos.fields.add(new NumberField({ name: "utm_easting" }));
  videos.fields.add(new NumberField({ name: "utm_northing" }));
  app.save(videos);

  // ponytail: lat/long-only deployments lose their coordinates on the way down (videos only had UTM fields before)
  app.db().newQuery(`
    UPDATE videos SET
      location_name = COALESCE((SELECT locationID FROM deployments d WHERE d.id = videos.deployment), ''),
      utm_easting = COALESCE((SELECT utm_easting FROM deployments d WHERE d.id = videos.deployment), 0),
      utm_northing = COALESCE((SELECT utm_northing FROM deployments d WHERE d.id = videos.deployment), 0)
  `).execute();

  videos.fields.removeByName("deployment");
  app.save(videos);

  app.delete(app.findCollectionByNameOrId("deployments"));
});
