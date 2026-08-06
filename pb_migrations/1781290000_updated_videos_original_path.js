/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.add(new TextField({
    name: "original_path",
  }));

  return app.save(videos);
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.removeByName("original_path");

  return app.save(videos);
});
