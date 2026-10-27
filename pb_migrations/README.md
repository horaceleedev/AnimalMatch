# PocketBase Development Environment

<!-- TODO this should become part of some kind of dev guide at some point. -->

> [!NOTE]
> All commands below should be run from the repository root.

## Fresh Local Instance

Download the PocketBase executable:

1. Go to the [PocketBase v0.36.9 release page](https://github.com/pocketbase/pocketbase/releases/tag/v0.36.9). (Any newer v0.36.x release should also work.)
2. Download the zip file for your operating system and processor (for example, `darwin_arm64` for an Apple Silicon Mac, or `windows_amd64` for most Windows PCs).
3. Unzip it and move the `pocketbase` file into the root of this repository.

Then create a local `.env` file. You only have to do this once per checkout.

```bash
cp .env.example .env
```

Edit `.env` and change the credentials if you like. Then create a fresh local database from the migrations by running the command below, which will create a `pb_data` directory within the repository root:

```bash
./pocketbase migrate up
```

Note: to store the database elsewhere, add `--dir /path/to/pb_data --migrationsDir /path/to/pb_migrations` to this and every later `./pocketbase` command.

Create a local admin account or pocketbase will not start completely:

```bash
source .env
./pocketbase superuser create "$POCKETBASE_SUPERUSER_EMAIL" "$POCKETBASE_SUPERUSER_PASSWORD"
```

Start pocketbase:

```bash
./pocketbase serve
```

The admin dashboard is available at:

```txt
http://127.0.0.1:8090/_/
```

We don't currently have seed data so you might want to create a local app user so you can log into the frontend:

1. Open `http://127.0.0.1:8090/_/` and log in with the superuser you just created.
2. Go to the `users` collection and create a record.
3. Set `email`, `username`, `password`, `passwordConfirm`, and `role`.
4. Use `role=editor` if you want create/update in the app.

With `VITE_DATABASE_URL=http://127.0.0.1:8090` run the frontend with:

```bash
npm run dev
```

## Migrations

PocketBase stores applied migration filenames in its internal `_migrations` table. It does not use Alembic-style `revision` / `down_revision` links. Migration order is determined by filename, so keep migration filenames timestamp-ordered.

Apply all pending app migrations:

```bash
./pocketbase migrate up
```

Revert the last migration:

```bash
./pocketbase migrate down 1
```

Revert the last N migrations:

```bash
./pocketbase migrate down 3
```

Note: PocketBase has its own internal migrations in addition to our user-defined migrations.
By default PocketBase looks for a `pb_migrations` folder right next to the `pb_data` folder. If your `pb_data` folder is not located in the repository root, make sure to pass `--migrationsDir /<repo root here>/pb_migrations` when running `migrate up`, `migrate down`, or `serve`, otherwise you can get funky behaviour.
Before confirming a `migrate down`, check the filenames PocketBase prints.

Create a new blank migration:

```bash
./pocketbase migrate create some_changes_to_schema
```

Include both up and down migration code where a safe rollback is possible.

### Automatic migrations

Starting from a blank migration is usually the clearest option. For exploratory changes, you can also let PocketBase generate a migration from dashboard edits:

1. Start PocketBase with `--migrationsDir pb_migrations`.
2. Make the collection/field change in `http://127.0.0.1:8090/_/`.
3. PocketBase will generate a migration file automatically.
4. Review or rewrite the generated migration file before committing it.

For example, adding a new field `test_field` to `individuals` generated:

```js
migrate((app) => {
  const collection = app.findCollectionByNameOrId("0xs6jxg6t0f3um0")

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1345053523",
    "max": 0,
    "min": 0,
    "name": "test_field",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("0xs6jxg6t0f3um0")

  // remove field
  collection.fields.removeById("text1345053523")

  return app.save(collection)
})
```

Generated migrations often use collection IDs, field IDs, and verbose field objects. Prefer rewriting them to use collection and field names where possible:

```js
migrate((app) => {
  const individuals = app.findCollectionByNameOrId("individuals");

  individuals.fields.add(new TextField({
    name: "test_field",
  }));

  return app.save(individuals);
}, (app) => {
  const individuals = app.findCollectionByNameOrId("individuals");

  individuals.fields.removeByName("test_field");

  return app.save(individuals);
});
```
