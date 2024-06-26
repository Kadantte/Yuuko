import { triggerController } from "./trigger.controller";
import { publicController } from "./public.controller";
import { infoController } from "./info.controller";
import { Elysia } from "elysia";

export const api = new Elysia({
  prefix: "/api/v1",
  name: "api:root"
})
  .guard({
    beforeHandle({ set, headers }) {
      if (!headers.authorization || !process.env.TRUSTED_USERS.includes(headers.authorization)) {
        set.status = 401;
        return { message: "Unauthorized" };
      }
    }
  },
    (app) =>
      app.use(triggerController)
        .use(infoController)
  ).use(publicController)