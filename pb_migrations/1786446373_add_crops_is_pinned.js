/// <reference path="../pb_data/types.d.ts" />

// Adds the `is_pinned` bool field to the `crops` collection, used to pin a crop to the
// front of an individual's crops.
//
// This field was originally added by hand in the dashboard as `is_featured` and never made
// it into a migration, so instances are in one of three states: no such field at all (any
// instance built from the initial migration), an `is_featured` field, or already migrated.
// All three are handled here.
//
// Renaming is done by re-adding the field with its existing id: `fields.add` replaces a
// field matching by id, and the id is what PocketBase uses as the stable identifier across
// a rename, so the column and its data are preserved.

const renameField = (collection, fromName, toName) => {
  const existing = collection.fields.getByName(fromName);
  if (!existing) return false;
  collection.fields.add(new BoolField({ id: existing.id, name: toName }));
  return true;
};

migrate((app) => {
  const crops = app.findCollectionByNameOrId("crops");

  if (!renameField(crops, "is_featured", "is_pinned") && !crops.fields.getByName("is_pinned")) {
    crops.fields.add(new BoolField({ name: "is_pinned" }));
  }

  return app.save(crops);
}, (app) => {
  const crops = app.findCollectionByNameOrId("crops");

  // Roll back to the pre-migration name rather than dropping the field, so that pinned
  // values survive a `migrate down`.
  renameField(crops, "is_pinned", "is_featured");

  return app.save(crops);
});
