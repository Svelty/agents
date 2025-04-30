import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("messages", function (table) {
        table.increments("id").primary();
        table.string("thread_text", 1000); // small text snippet
        table
            .boolean("is_thread_text_truncated")
            .notNullable()
            .defaultTo(false);
        table.string("reply_address", 1000);
        table.string("last_message_id");
        table.string("thread_id");
        table.string("subject");
        table.string("message_type");
        table.boolean("is_replied_to").notNullable().defaultTo(false);
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("messages");
}
