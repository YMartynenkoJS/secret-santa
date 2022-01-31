import { fastify, FastifyRequest } from "fastify";

import { setUp, getDatabase } from "./database/database";
import { handleSQLLiteError } from "./utils/handleSQLLiteError";
import { responseWithError } from "./utils/responseWithError";
import { responseWithData } from "./utils/responseWithData";
import { Gift, User, UserPayload } from "./types";
import { getRandomInt } from "./utils/getRandomInt";

const PORT = process.env.PORT || 3000;
const server = fastify();

const start = async () => {
  try {
    await server.listen(PORT);
    console.log("Server started successfully");

    setUp();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

const MAX_USERS_AMOUNT = 500;
const MIN_USERS_AMOUNT = 3;

server.post<{ Body: UserPayload }>("/api/register", (req, res) => {
  const db = getDatabase();
  const { body } = req;

  if (body.gifts && body.gifts.length > 10) {
    return responseWithError(res, "Gifts length must not be greater than 10");
  }

  db.all("SELECT id FROM users", (err, users: { id: number }[]) => {
    handleSQLLiteError(res, err, () => {
      if (users.length >= MAX_USERS_AMOUNT) {
        responseWithError(
          res,
          `You have reached max(${MAX_USERS_AMOUNT}) amount of users`
        );
        return;
      }
      db.run(
        `INSERT INTO users(firstName, lastName) VALUES("${body.firstName}", "${body.lastName}")`,
        function (err) {
          const userId = this.lastID;

          handleSQLLiteError(res, err, () => {
            if (body.gifts) {
              db.run(
                `INSERT INTO gifts(userId, description) VALUES${body.gifts
                  .map((gift) => `("${userId}", "${gift}")`)
                  .join(", ")}`,
                (err) => {
                  handleSQLLiteError(res, err, () => {
                    res.code(200).send();
                  });
                }
              );
            } else {
              res.code(200).send();
            }
          });
        }
      );
    });
  });

  db.close();
});

server.get("/api/users", (req, res) => {
  const db = getDatabase();

  db.all("SELECT * FROM users", function (err, users: User[]) {
    handleSQLLiteError(res, err, () => {
      responseWithData(res, users);
    });
  });

  db.close();
});

server.get("/api/gifts", (req, res) => {
  const db = getDatabase();

  db.all("SELECT * FROM gifts", (err, gifts: Gift[]) => {
    handleSQLLiteError(res, err, () => {
      responseWithData(res, gifts);
    });
  });

  db.close();
});

server.get(
  "/api/assignedUser/:id",
  (req: FastifyRequest<{ Params: { id: number } }>, res) => {
    const db = getDatabase();

    db.get(
      `SELECT assignedId FROM users WHERE id = "${req.params.id}"`,
      (err, user?: Pick<User, "assignedId">) => {
        handleSQLLiteError(res, err, () => {
          if (user?.assignedId) {
            db.get(
              `SELECT firstName, lastName FROM users WHERE id = "${user.assignedId}"`,
              (err, assignedUser?: User) => {
                handleSQLLiteError(res, err, () => {
                  if (assignedUser) {
                    db.all(
                      `SELECT description FROM gifts WHERE userId = "${user.assignedId}"`,
                      (err, gifts: Gift[]) => {
                        handleSQLLiteError(res, err, () => {
                          if (assignedUser) {
                            const { id, ...data } = assignedUser;

                            responseWithData(res, {
                              ...data,
                              gifts: gifts.map(
                                ({ description }) => description
                              ),
                            });
                            return;
                          }
                        });
                      }
                    );
                    return;
                  }
                });
              }
            );
            return;
          }
          res.send();
        });
      }
    );

    db.close();
  }
);

server.post("/api/shuffle", (req, res) => {
  const db = getDatabase();

  db.all(
    "SELECT * FROM users WHERE assignedId IS NULL",
    function (err, users: User[]) {
      handleSQLLiteError(res, err, () => {
        if (!users?.length) {
          return responseWithError(res, "Users are already shuffled");
        }

        if (users.length < MIN_USERS_AMOUNT) {
          return responseWithError(
            res,
            `There are not enough users. Please register at least ${MIN_USERS_AMOUNT} users`
          );
        }

        const clonedUsers = [...users];

        for (const user of users) {
          let index = getRandomInt(0, clonedUsers.length - 1);
          let assignedUser = clonedUsers[index];

          if (!assignedUser || assignedUser.id === user.id) {
            if (index === clonedUsers.length - 1) {
              index -= 1;
            } else {
              index += 1;
            }

            assignedUser = clonedUsers[index];
          }

          if (assignedUser) {
            user.assignedId = assignedUser.id;
            clonedUsers.splice(index, 1);
          }
        }
        db.parallelize(() => {
          users.forEach((user) => {
            db.run(
              `UPDATE users SET assignedId="${user.assignedId}" WHERE id="${user.id}"`
            );
          });
        });

        responseWithData(res, users);
      });
    }
  );

  db.close();
});
