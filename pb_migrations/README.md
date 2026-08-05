# PocketBase Development Environment

This should become part of some kind of dev guide at some point.

## Fresh Local Instance

Install the PocketBase binary if you haven't already, then from the repository root create a local `.env` file. You only have to do this once per checkout.

```bash
cp .env.example .env
```

Edit `.env` and change the credentials if you like. Then create a fresh local database from migrations. Fresh means using an empty or deleted `pb_data` directory. You can use a different directory if you do not want the database under `/tmp`.

```bash
rm -rf /tmp/animalmatch-pb
mkdir -p /tmp/animalmatch-pb
pocketbase migrate up \
  --dir /tmp/animalmatch-pb/pb_data \
  --migrationsDir pb_migrations
```

Create a local admin account or pocketbase will not start completely:

```bash
source .env
pocketbase superuser create "$POCKETBASE_SUPERUSER_EMAIL" "$POCKETBASE_SUPERUSER_PASSWORD" \
  --dir /tmp/animalmatch-pb/pb_data
```

Start pocketbase:

```bash
pocketbase serve \
  --dir /tmp/animalmatch-pb/pb_data \
  --migrationsDir pb_migrations
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
pocketbase migrate up \
  --dir /tmp/animalmatch-pb/pb_data \
  --migrationsDir pb_migrations
```

Revert the last migration:

```bash
pocketbase migrate down 1 \
  --dir /tmp/animalmatch-pb/pb_data \
  --migrationsDir pb_migrations
```

Revert the last N migrations:

```bash
pocketbase migrate down 3 \
  --dir /tmp/animalmatch-pb/pb_data \
  --migrationsDir pb_migrations
```

Note: I discovered that PocketBase has its own internal migrations as well as our user-defined migrations.
Always be consistent by passing `--migrationsDir pb_migrations` when running `migrate up`, `migrate down`, or `serve`, otherwise you can get funky behaviour.
Before confirming a `migrate down`, check the filenames PocketBase prints.

Create a new blank migration:

```bash
pocketbase migrate create some_changes_to_schema \
  --migrationsDir pb_migrations
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
