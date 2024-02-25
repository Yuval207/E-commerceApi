const express = require("express");
const prisma = require("./DB/db.config.js");
const swaggerUi = require("swagger-ui-express");
const jwt = require("jsonwebtoken");
const YAML = require("yamljs");
const authenticateJwt = require("./middlewares/authenticate.js");

const PORT = 3000;
const SECRET = "secretive";
const app = express();
app.use(express.json());

app.post("/signup", async (req, res) => {
  try {
    const { username, password, email, address } = req.body;
    const user = await prisma.user.create({
      data: {
        username: username,
        password: password,
        email: email,
        address: address,
      },
    });
    const token = jwt.sign({ user: user }, SECRET);
    res
      .status(201)
      .json({ message: "User created successfully", token: token });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const token = jwt.sign({ user: user }, SECRET);
    return res.json({ message: "Login successful", token: token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/products", authenticateJwt, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        name: true,
        price: true,
        description: true,
      },
    });
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/products/:categoryName", authenticateJwt, async (req, res) => {
  try {
    const categoryName = req.params.categoryName;
    const products = await prisma.product.findMany({
      where: {
        category: {
          name: categoryName,
        },
      },
      select: {
        name: true,
        price: true,
        description: true,
      },
    });
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/product/:productId", authenticateJwt, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        name: true,
        price: true,
        description: true,
        quantity: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    res.json({ product });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/cart/:productId", authenticateJwt, async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    const userId = req.user.id;
    const cart = await prisma.cart.create({
      data: {
        user_id: userId,
        product_id: productId,
        quantity: 1, // Assuming user adds 1 quantity by default
      },
    });
    res.json({ message: "Product added to cart", cart });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/order/:productId", authenticateJwt, async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    const userId = req.user.id;

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });
    if (!product || product.quantity < 1) {
      return res.status(400).json({ message: "Product out of stock" });
    }

    await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        quantity: {
          decrement: 1,
        },
      },
    });

    const order = await prisma.order.create({
      data: {
        user_id: userId,
        product_id: productId,
        completed: false,
      },
    });
    res.json({ message: "Order placed successfully", order });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/cart/buy", authenticateJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItems = await prisma.cart.findMany({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        user_id: true,
        product_id: true,
        quantity: true,
      },
    });

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: {
          id: item.product_id,
        },
      });

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ message: "Product out of stock" });
      }
    }

    const orders = [];
    for (const item of cartItems) {
      await prisma.product.update({
        where: {
          id: item.product_id,
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      const order = await prisma.order.create({
        data: {
          user_id: userId,
          product_id: item.product_id,
          quantity: item.quantity,
          completed: true,
        },
      });
      orders.push(order);
    }

    await prisma.cart.deleteMany({
      where: {
        user_id: userId,
      },
    });

    res.json({ message: "Cart bought successfully", orders });
  } catch (error) {
    console.error("Error buying cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/cart", authenticateJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.cart.deleteMany({
      where: {
        user_id: userId,
      },
    });
    res.json({ message: "Cart deleted successfully" });
  } catch (error) {
    console.error("Error deleting cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/orders", authenticateJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: {
        user_id: userId,
      },
    });
    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/order/:orderId", authenticateJwt, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });
    res.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const swaggerDocument = YAML.load("./swagger.yaml");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => {
  console.log("server started");
});
