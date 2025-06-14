import { Sequelize } from "sequelize-typescript";
import { Channel } from "src/channel/channel.entity";
import { Message } from "src/message/message.entity";
import { User } from "src/user/user.entity";

export const databaseProviders = [
  {
    provide: "SEQUELIZE",
    useFactory: async () => {
      const sequelize = new Sequelize(
        "postgresql://neondb_owner:npg_jaMc2QP1KRJw@ep-lively-band-a5oc9isq-pooler.us-east-2.aws.neon.tech/neondb",
        {
          dialect: "postgres",
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false, // Désactiver la vérification du certificat SSL si nécessaire
            },
          },
          logging: false, // Désactive les logs SQL dans la console (optionnel)
        }
      );

      sequelize.addModels([User, Message, Channel]);
      await sequelize.sync();
      return sequelize;
    },
  },
];
