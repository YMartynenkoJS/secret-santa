import { FastifyReply } from "fastify";

export const responseWithData = <T extends any>(
  reply: FastifyReply,
  data?: T
) => {
  reply.code(200);
  if (data) {
    reply.send(
      JSON.stringify({
        data,
      })
    );
  }
};
