import { AuthResolver} from "./modules/user/user.resolver";
import { buildSchema } from "type-graphql";
import { TestResolver } from "./modules/test.resolver";

export const createSchema = () =>
  buildSchema({
    resolvers: [AuthResolver, TestResolver], // Add TestResolver
    validate: false,
  });

