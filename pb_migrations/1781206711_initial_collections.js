/// <reference path="../pb_data/types.d.ts" />

const editorOnlyRule = '@request.auth.id != "" && @request.auth.role = "editor"';
const signedInRule = '@request.auth.id != ""';

const collectionIds = {
  users: "_pb_users_auth_",
  crops: "ycn645cy01kycy7",
  individuals: "0xs6jxg6t0f3um0",
  videos: "tb7vvfchjp5ux85",
};

const addFieldIfMissing = (collection, field) => {
  try {
    collection.fields.getByName(field.name);
  } catch {
    collection.fields.add(field);
  }
};

const collectionExists = (app, nameOrId) => {
  try {
    app.findCollectionByNameOrId(nameOrId);
    return true;
  } catch {
    return false;
  }
};

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = signedInRule;
  users.viewRule = 'id = @request.auth.id';
  users.createRule = null;
  users.updateRule = 'id = @request.auth.id';
  users.deleteRule = 'id = @request.auth.id';
  users.passwordAuth.enabled = true;
  addFieldIfMissing(users, new TextField({
    name: "username",
    required: true,
    min: 3,
    max: 150,
    pattern: "^[\\w][\\w\\.\\-]*$",
    autogeneratePattern: "users[0-9]{6}",
  }));
  addFieldIfMissing(users, new TextField({ name: "name" }));
  addFieldIfMissing(users, new FileField({
    name: "avatar",
    maxSelect: 1,
    maxSize: 5242880,
    mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
  }));
  addFieldIfMissing(users, new SelectField({
    name: "role",
    maxSelect: 1,
    values: ["viewer", "editor"],
  }));
  app.save(users);

  if (collectionExists(app, collectionIds.videos) || collectionExists(app, "videos")) {
    return;
  }

  const videos = new Collection({
    id: collectionIds.videos,
    type: "base",
    name: "videos",
    listRule: signedInRule,
    viewRule: signedInRule,
    createRule: editorOnlyRule,
    updateRule: editorOnlyRule,
    deleteRule: null,
    fields: [
      { name: "filename", type: "text", required: true },
      { name: "file", type: "file", required: true, maxSelect: 1, maxSize: 10000000000 },
      {
        name: "thumbnail",
        type: "file",
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      },
      { name: "location_name", type: "text" },
      { name: "recording_date", type: "date" },
      { name: "month_of_SD_retrieval", type: "text" },
      { name: "habitat", type: "text" },
      { name: "utm_easting", type: "number" },
      { name: "utm_northing", type: "number" },
      { name: "altitude", type: "number" },
      { name: "num_individuals", type: "number" },
      { name: "notes", type: "editor" },
      { name: "custom_tags", type: "json" },
      { name: "assignees", type: "relation", collectionId: collectionIds.users, maxSelect: 2147483647 },
      { name: "annotation_status", type: "text" },
    ],
  });
  app.save(videos);

  const individuals = new Collection({
    id: collectionIds.individuals,
    type: "base",
    name: "individuals",
    listRule: signedInRule,
    viewRule: signedInRule,
    createRule: editorOnlyRule,
    updateRule: editorOnlyRule,
    deleteRule: editorOnlyRule,
    fields: [
      { name: "name", type: "text", required: true },
      { name: "created_by", type: "relation", collectionId: collectionIds.users, maxSelect: 1 },
      { name: "is_identified", type: "bool" },
      { name: "videos", type: "relation", collectionId: collectionIds.videos, maxSelect: 2147483647, required: true },
      { name: "age", type: "select", maxSelect: 1, values: ["infant", "juvenile", "adolescent", "adult", "unknown age"] },
      { name: "sex", type: "select", maxSelect: 1, values: ["male", "female", "unknown/other sex"] },
      { name: "notes", type: "editor" },
      { name: "custom_tags", type: "json" },
    ],
  });
  app.save(individuals);

  videos.fields.add(new RelationField({
    name: "individuals",
    collectionId: collectionIds.individuals,
    maxSelect: 2147483647,
  }));
  app.save(videos);

  const crops = new Collection({
    id: collectionIds.crops,
    type: "base",
    name: "crops",
    listRule: signedInRule,
    viewRule: signedInRule,
    createRule: editorOnlyRule,
    updateRule: editorOnlyRule,
    deleteRule: editorOnlyRule,
    fields: [
      { name: "image", type: "file", required: true, maxSelect: 1, maxSize: 5242880 },
      { name: "created_by", type: "relation", collectionId: collectionIds.users, maxSelect: 1 },
      { name: "source_video", type: "relation", collectionId: collectionIds.videos, maxSelect: 1 },
      { name: "individual", type: "relation", collectionId: collectionIds.individuals, maxSelect: 1, cascadeDelete: true },
      { name: "body_part", type: "text" },
      { name: "side", type: "text" },
      { name: "custom_tags", type: "json" },
      { name: "description", type: "editor" },
      { name: "frame_number", type: "number" },
      { name: "timestamp", type: "number" },
      { name: "crop_coordinates", type: "json" },
      { name: "width", type: "number" },
      { name: "height", type: "number" },
    ],
  });
  app.save(crops);
}, (app) => {
  try {
    const videos = app.findCollectionByNameOrId("videos");
    videos.fields.removeByName("individuals");
    app.save(videos);
  } catch {}

  for (const name of ["crops", "individuals", "videos"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch {}
  }
});
