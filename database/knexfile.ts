import type { Knex } from "knex";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
    development: {
        client: "postgres",
        connection: {
            database: "story-bot",
            user: "postgres",
            password: "postgres",
            host: "localhost",
            port: 5432,
            ssl: false,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            directory: "./migrations",
            tableName: "knex_migrations",
        },
    },

    // staging: {
    //   client: "postgresql",
    //   connection: {
    //     database: "my_db",
    //     user: "username",
    //     password: "password"
    //   },
    //   pool: {
    //     min: 2,
    //     max: 10
    //   },
    //   migrations: {
    //     tableName: "knex_migrations"
    //   }
    // },

    // production: {
    //   client: "postgresql",
    //   connection: {
    //     database: "my_db",
    //     user: "username",
    //     password: "password"
    //   },
    //   pool: {
    //     min: 2,
    //     max: 10
    //   },
    //   migrations: {
    //     tableName: "knex_migrations"
    //   }
    // }
};

module.exports = config;
