import knex, { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

const config: Knex.Config = {
    client: "pg",
    connection: {
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        ssl: process.env.DB_SSL === "true",
    },
    pool: { min: 2, max: 10 },
    migrations: {
        directory: "./src/database/migrations",
        tableName: "knex_migrations",
    },
};

const db = knex(config);

export default db;
export { config };

// import type { Knex } from "knex";
// import dotenv from "dotenv";

// dotenv.config();

// //TODO: config is duplicated in connector
// export const config: { [key: string]: Knex.Config } = {
//     development: {
//         client: "postgres",
//         connection: {
//             database: "story-bot-2",
//             user: "postgres",
//             password: "postgres",
//             host: "localhost",
//             port: 5432,
//             ssl: false,
//         },
//         // connection: {
//         //     database: process.env.DB_DATABASE,
//         //     user: process.env.DB_USER,
//         //     password: process.env.DB_PASSWORD,
//         //     host: process.env.DB_HOST,
//         //     port: parseInt(process.env.DB_PORT!),
//         //     ssl: process.env.DB_SSL == "true",
//         // },
//         pool: {
//             min: 2,
//             max: 10,
//         },
//         migrations: {
//             directory: "./migrations",
//             tableName: "knex_migrations",
//         },
//     },

//     // staging: {
//     //   client: "postgresql",
//     //   connection: {
//     //     database: "my_db",
//     //     user: "username",
//     //     password: "password"
//     //   },
//     //   pool: {
//     //     min: 2,
//     //     max: 10
//     //   },
//     //   migrations: {
//     //     tableName: "knex_migrations"
//     //   }
//     // },

//     // production: {
//     //   client: "postgresql",
//     //   connection: {
//     //     database: "my_db",
//     //     user: "username",
//     //     password: "password"
//     //   },
//     //   pool: {
//     //     min: 2,
//     //     max: 10
//     //   },
//     //   migrations: {
//     //     tableName: "knex_migrations"
//     //   }
//     // }
// };

// export default config;
