import { FastifyReply } from "fastify";

export const responseWithError = (reply: FastifyReply, err: Error | string) => {
  reply.code(500).send({ error: JSON.stringify(err) });
};
