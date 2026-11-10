/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.add(new TextField({
    name: "file_hash",
  }));

  return app.save(videos);
}, (app) => {
  const videos = app.findCollectionByNameOrId("videos");

  videos.fields.removeByName("file_hash");

  return app.save(videos);
});
