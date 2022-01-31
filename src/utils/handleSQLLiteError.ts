import { FastifyReply } from "fastify";
import { responseWithError } from "./responseWithError";

export const handleSQLLiteError = (
  reply: FastifyReply,
  err: Error | null,
  cb?: () => void
) => {
  if (err) {
    console.log(err);
    responseWithError(reply, err);
  } else {
    cb && cb();
  }
};
