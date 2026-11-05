/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.add(new BoolField({
    name: "needs_metadata",
  }));

  return app.save(videos);
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.removeByName("needs_metadata");

  return app.save(videos);
});
