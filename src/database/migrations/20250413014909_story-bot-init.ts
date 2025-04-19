import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("story", (table) => {
        table.increments("id").primary();
        table.string("title", 1000).notNullable();
        table.text("text").notNullable();
        table.boolean("is_approved").notNullable().defaultTo(false);
    });

    await knex.schema.createTable("story_chunks", (table) => {
        table.increments("id").primary();
        table
            .integer("story_id")
            .notNullable()
            .references("id")
            .inTable("story")
            .onDelete("CASCADE");
        table.integer("index").notNullable();
        table.string("text", 1000).notNullable();
        table.string("image_url", 2083);
        table.text("description", "text");
        table.unique(["story_id", "index"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("story_chunks");
    await knex.schema.dropTableIfExists("story");
}
