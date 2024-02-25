const jwt = require("jsonwebtoken");

const authenticateJwt = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = jwt.verify(token, "secretive");
    req.user = user.user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = authenticateJwt;
