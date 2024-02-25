const express = require("express");
const prisma = require("./DB/db.config.js");

const PORT = 3000;

const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {
  console.log(req.body);
  const { username, email, password } = req.body;

  const newUser = await prisma.user.create({
    data: {
      username: username,
      email: email,
      password: password,
    },
  });
  return res.json({ msg: "user created", newUser });
});

app.listen(PORT, () => {
  console.log("server started");
});
